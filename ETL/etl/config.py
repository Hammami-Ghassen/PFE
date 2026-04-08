from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import Engine, create_engine


def _as_bool(raw_value: str | None, default: bool) -> bool:
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "t", "yes", "y", "on"}


def _as_int(raw_value: str | None, default: int) -> int:
    if raw_value is None or raw_value.strip() == "":
        return default
    return int(raw_value)


@dataclass(frozen=True)
class DatabaseConfig:
    host: str
    port: int
    db_name: str
    user: str
    password: str

    @property
    def sqlalchemy_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.db_name}"
        )


@dataclass(frozen=True)
class EtlSettings:
    source_db: DatabaseConfig
    dw_db: DatabaseConfig
    source_schema: str
    chunk_size: int
    pipeline_name: str
    full_history_load: bool
    auto_prepare_schema: bool
    sql_dir: Path
    quality_sql_file: Path

    def create_source_engine(self) -> Engine:
        return create_engine(self.source_db.sqlalchemy_url, pool_pre_ping=True)

    def create_dw_engine(self) -> Engine:
        return create_engine(self.dw_db.sqlalchemy_url, pool_pre_ping=True)


def _load_env_files(etl_root: Path) -> None:
    project_root = etl_root.parent
    _load_env_file(project_root / ".env", override=False)
    _load_env_file(etl_root / ".env", override=False)
    _load_env_file(etl_root / ".env.local", override=True)


def _load_env_file(file_path: Path, override: bool) -> None:
    if not file_path.exists() or not file_path.is_file():
        return

    for line in file_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        key = key.strip()
        if key.startswith("export "):
            key = key[7:].strip()

        value = value.strip().strip('"').strip("'")
        if not key:
            continue

        if override or key not in os.environ:
            os.environ[key] = value


def load_settings() -> EtlSettings:
    etl_root = Path(__file__).resolve().parents[1]
    sql_dir = etl_root / "sql"
    _load_env_files(etl_root)

    source_db = DatabaseConfig(
        host=os.getenv("SOURCE_DB_HOST", "localhost"),
        port=_as_int(os.getenv("SOURCE_DB_PORT"), 5432),
        db_name=os.getenv("SOURCE_DB_NAME", "grh_msp"),
        user=os.getenv("SOURCE_DB_USER", "postgres"),
        password=os.getenv("SOURCE_DB_PASSWORD", "postgres"),
    )

    dw_db = DatabaseConfig(
        host=os.getenv("DW_DB_HOST", "localhost"),
        port=_as_int(os.getenv("DW_DB_PORT"), 5432),
        db_name=os.getenv("DW_DB_NAME", "DW_msp"),
        user=os.getenv("DW_DB_USER", "postgres"),
        password=os.getenv("DW_DB_PASSWORD", "postgres"),
    )

    return EtlSettings(
        source_db=source_db,
        dw_db=dw_db,
        source_schema=os.getenv("SOURCE_DB_SCHEMA", "public"),
        chunk_size=_as_int(os.getenv("ETL_CHUNK_SIZE"), 100000),
        pipeline_name=os.getenv("ETL_PIPELINE_NAME", "phase1_etl_grh_msp"),
        full_history_load=_as_bool(os.getenv("ETL_FULL_HISTORY_LOAD"), True),
        auto_prepare_schema=_as_bool(os.getenv("ETL_AUTO_PREPARE_SCHEMA"), True),
        sql_dir=sql_dir,
        quality_sql_file=sql_dir / "quality_checks.sql",
    )
