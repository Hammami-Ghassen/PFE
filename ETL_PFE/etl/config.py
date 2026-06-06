import os
from sqlalchemy import create_engine

SRC_DB = {
    "host": os.getenv("SRC_DB_HOST", "localhost"),
    "port": os.getenv("SRC_DB_PORT", "5432"),
    "name": os.getenv("SRC_DB_NAME", "grh_msp"),
    "user": os.getenv("SRC_DB_USER", "postgres"),
    "password": os.getenv("SRC_DB_PASSWORD", "Idriss11438193"),
}

DW_DB = {
    "host": os.getenv("DW_DB_HOST", "localhost"),
    "port": os.getenv("DW_DB_PORT", "5432"),
    "name": os.getenv("DW_DB_NAME", "dw"),
    "user": os.getenv("DW_DB_USER", "postgres"),
    "password": os.getenv("DW_DB_PASSWORD", "Idriss11438193"),
}

SNAPSHOT_DATE = os.getenv("SNAPSHOT_DATE", "2025-12-31")

def build_url(cfg: dict) -> str:
    return (
        f"postgresql+psycopg2://{cfg['user']}:{cfg['password']}"
        f"@{cfg['host']}:{cfg['port']}/{cfg['name']}"
    )

def get_source_engine():
    return create_engine(build_url(SRC_DB))

def get_dw_engine():
    return create_engine(build_url(DW_DB))