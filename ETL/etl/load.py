from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd
from psycopg2.extras import execute_values
from sqlalchemy import Engine, text


@dataclass
class Watermark:
    last_pointage_date: Any
    last_retard_date: Any
    last_success_at: Any


class WarehouseLoader:
    def __init__(self, engine: Engine, sql_dir: Path, pipeline_name: str) -> None:
        self.engine = engine
        self.sql_dir = sql_dir
        self.pipeline_name = pipeline_name

    @staticmethod
    def _clean_value(value: Any) -> Any:
        if pd.isna(value):
            return None
        if isinstance(value, pd.Timestamp):
            return value.to_pydatetime()
        if hasattr(value, "item") and not isinstance(value, (str, bytes)):
            try:
                return value.item()
            except Exception:
                return value
        return value

    @staticmethod
    def _to_int_keys(series: pd.Series) -> pd.Series:
        return pd.to_numeric(series, errors="coerce").fillna(0).astype(int)

    def _run_sql_script(self, script_path: Path) -> None:
        sql_text = script_path.read_text(encoding="utf-8")
        with self.engine.begin() as conn:
            conn.exec_driver_sql(sql_text)

    def prepare_schema(self) -> None:
        self._run_sql_script(self.sql_dir / "create_dimensions.sql")
        self._run_sql_script(self.sql_dir / "create_facts.sql")

    def _upsert_dataframe(
        self,
        df: pd.DataFrame,
        table_name: str,
        conflict_cols: list[str],
        update_cols: list[str] | None = None,
    ) -> int:
        if df is None or df.empty:
            return 0

        data = df.copy()
        data = data.drop_duplicates(subset=conflict_cols) if conflict_cols else data.drop_duplicates()
        columns = list(data.columns)
        records = [tuple(self._clean_value(v) for v in row) for row in data.itertuples(index=False, name=None)]
        if not records:
            return 0

        quoted_table = f'"{table_name}"'
        quoted_cols = ", ".join(f'"{col}"' for col in columns)
        conflict_sql = ", ".join(f'"{col}"' for col in conflict_cols)

        update_sql = ""
        if update_cols:
            set_parts = [f'"{col}" = EXCLUDED."{col}"' for col in update_cols if col not in conflict_cols]
            if set_parts:
                update_sql = "DO UPDATE SET " + ", ".join(set_parts)
            else:
                update_sql = "DO NOTHING"
        else:
            update_sql = "DO NOTHING"

        insert_sql = (
            f"INSERT INTO {quoted_table} ({quoted_cols}) VALUES %s "
            f"ON CONFLICT ({conflict_sql}) {update_sql}"
        )

        raw_conn = self.engine.raw_connection()
        try:
            with raw_conn.cursor() as cursor:
                execute_values(cursor, insert_sql, records, page_size=10000)
            raw_conn.commit()
        finally:
            raw_conn.close()

        return len(records)

    def upsert_dimensions(self, dimensions: dict[str, pd.DataFrame]) -> dict[str, int]:
        config = {
            "d_temps": {
                "conflict": ["date_key"],
                "update": [
                    "full_date",
                    "year_num",
                    "quarter_num",
                    "month_num",
                    "month_name",
                    "week_num",
                    "day_num",
                    "day_name",
                    "is_weekend",
                ],
            },
            "d_service": {
                "conflict": ["cod_serv"],
                "update": ["lib_serv", "updated_at"],
            },
            "d_gouvernorat": {
                "conflict": ["cod_gouv"],
                "update": ["lib_gouv", "updated_at"],
            },
            "d_grade": {
                "conflict": ["cod_grad"],
                "update": ["lib_grad", "updated_at"],
            },
            "d_etat_act": {
                "conflict": ["etat_act"],
                "update": ["etat_act_desc"],
            },
            "d_sexe": {
                "conflict": ["sexe"],
                "update": ["sexe_desc"],
            },
            "d_motif_conge": {
                "conflict": ["code_m"],
                "update": ["lib_motif", "updated_at"],
            },
            "d_statut_conge": {
                "conflict": ["status_code"],
                "update": ["valid", "etat_cng", "nat_cng", "statut_desc", "updated_at"],
            },
            "d_type_pointage": {
                "conflict": ["typ_point"],
                "update": ["type_pointage_desc"],
            },
            "d_etat_retard": {
                "conflict": ["etat_retard"],
                "update": ["etat_retard_desc"],
            },
            "d_personnel": {
                "conflict": ["cod_soc", "mat_pers"],
                "update": [
                    "full_name",
                    "pren_pers",
                    "nom_pers",
                    "cod_serv",
                    "cod_gouv",
                    "cod_grad",
                    "etat_act",
                    "sexe",
                    "birth_date",
                    "hire_date",
                    "is_active",
                    "updated_at",
                ],
            },
        }

        counts: dict[str, int] = {}
        for table_name, table_cfg in config.items():
            df = dimensions.get(table_name)
            if df is None or df.empty:
                counts[table_name] = 0
                continue
            counts[table_name] = self._upsert_dataframe(
                df=df,
                table_name=table_name,
                conflict_cols=table_cfg["conflict"],
                update_cols=table_cfg["update"],
            )
        return counts

    def _fetch_df(self, sql_query: str) -> pd.DataFrame:
        return pd.read_sql_query(text(sql_query), self.engine)

    def _build_lookup_cache(self) -> dict[str, pd.DataFrame]:
        return {
            "personnel": self._fetch_df(
                """
                SELECT personnel_key, cod_soc, mat_pers, cod_serv
                FROM d_personnel
                """
            ),
            "service": self._fetch_df("SELECT service_key, cod_serv FROM d_service"),
            "gouvernorat": self._fetch_df("SELECT gouvernorat_key, cod_gouv FROM d_gouvernorat"),
            "grade": self._fetch_df("SELECT grade_key, cod_grad FROM d_grade"),
            "etat_act": self._fetch_df("SELECT etat_act_key, etat_act FROM d_etat_act"),
            "sexe": self._fetch_df("SELECT sexe_key, sexe FROM d_sexe"),
            "motif": self._fetch_df("SELECT motif_conge_key, code_m FROM d_motif_conge"),
            "statut": self._fetch_df("SELECT statut_conge_key, status_code FROM d_statut_conge"),
            "type_pointage": self._fetch_df("SELECT type_pointage_key, typ_point FROM d_type_pointage"),
            "etat_retard": self._fetch_df("SELECT etat_retard_key, etat_retard FROM d_etat_retard"),
        }

    def load_effectif_snapshot(self, fact_df: pd.DataFrame) -> int:
        if fact_df is None or fact_df.empty:
            return 0

        cache = self._build_lookup_cache()
        fact = fact_df.copy()

        personnel_keys = cache["personnel"][["personnel_key", "cod_soc", "mat_pers"]].drop_duplicates(
            subset=["cod_soc", "mat_pers"]
        )
        fact = fact.merge(personnel_keys, on=["cod_soc", "mat_pers"], how="left")
        fact = fact.merge(cache["service"], on=["cod_serv"], how="left")
        fact = fact.merge(cache["gouvernorat"], on=["cod_gouv"], how="left")
        fact = fact.merge(cache["grade"], on=["cod_grad"], how="left")
        fact = fact.merge(cache["etat_act"], on=["etat_act"], how="left")
        fact = fact.merge(cache["sexe"], on=["sexe"], how="left")

        fact["personnel_key"] = self._to_int_keys(fact["personnel_key"])
        fact["service_key"] = self._to_int_keys(fact["service_key"])
        fact["gouvernorat_key"] = self._to_int_keys(fact["gouvernorat_key"])
        fact["grade_key"] = self._to_int_keys(fact["grade_key"])
        fact["etat_act_key"] = self._to_int_keys(fact["etat_act_key"])
        fact["sexe_key"] = self._to_int_keys(fact["sexe_key"])

        insert_df = fact[
            [
                "snapshot_date_key",
                "personnel_key",
                "service_key",
                "gouvernorat_key",
                "grade_key",
                "etat_act_key",
                "sexe_key",
                "nb_agent",
                "age",
                "anciennete_jours",
                "cod_soc",
                "mat_pers",
            ]
        ].copy()

        return self._upsert_dataframe(
            df=insert_df,
            table_name="f_effectif_snapshot",
            conflict_cols=["snapshot_date_key", "personnel_key"],
            update_cols=[
                "service_key",
                "gouvernorat_key",
                "grade_key",
                "etat_act_key",
                "sexe_key",
                "nb_agent",
                "age",
                "anciennete_jours",
                "cod_soc",
                "mat_pers",
                "updated_at",
            ],
        )

    def load_demande_conge(self, fact_df: pd.DataFrame) -> int:
        if fact_df is None or fact_df.empty:
            return 0

        cache = self._build_lookup_cache()
        fact = fact_df.copy()

        personnel_lookup = cache["personnel"].rename(columns={"cod_serv": "cod_serv_personnel"})
        fact = fact.merge(personnel_lookup, on=["cod_soc", "mat_pers"], how="left")

        if "cod_serv" not in fact.columns:
            fact["cod_serv"] = fact["cod_serv_personnel"]
        else:
            fact["cod_serv"] = fact["cod_serv"].fillna(fact["cod_serv_personnel"])
            fact.loc[fact["cod_serv"].isin(["", "UNK"]), "cod_serv"] = fact["cod_serv_personnel"]
        fact["cod_serv"] = fact["cod_serv"].fillna("UNK")

        fact = fact.merge(cache["service"], on=["cod_serv"], how="left")
        fact = fact.merge(cache["motif"], on=["code_m"], how="left")
        fact = fact.merge(cache["statut"], on=["status_code"], how="left")

        fact["personnel_key"] = self._to_int_keys(fact["personnel_key"])
        fact["service_key"] = self._to_int_keys(fact["service_key"])
        fact["motif_conge_key"] = self._to_int_keys(fact["motif_conge_key"])
        fact["statut_conge_key"] = self._to_int_keys(fact["statut_conge_key"])

        insert_df = fact[
            [
                "date_demande_key",
                "date_debut_key",
                "date_fin_key",
                "personnel_key",
                "service_key",
                "motif_conge_key",
                "statut_conge_key",
                "nb_demande",
                "nbr_jours",
                "nbr_heure",
                "nbr_jours_cal",
                "cod_soc",
                "mat_pers",
                "num_dcng",
                "date_demande",
                "date_debut",
                "date_fin",
            ]
        ].copy()

        return self._upsert_dataframe(
            df=insert_df,
            table_name="f_demande_conge",
            conflict_cols=["cod_soc", "mat_pers", "num_dcng"],
            update_cols=[
                "date_demande_key",
                "date_debut_key",
                "date_fin_key",
                "personnel_key",
                "service_key",
                "motif_conge_key",
                "statut_conge_key",
                "nb_demande",
                "nbr_jours",
                "nbr_heure",
                "nbr_jours_cal",
                "date_demande",
                "date_debut",
                "date_fin",
                "updated_at",
            ],
        )

    def load_justificatif_conge(self, fact_df: pd.DataFrame) -> int:
        if fact_df is None or fact_df.empty:
            return 0

        cache = self._build_lookup_cache()
        fact = fact_df.copy()

        personnel_lookup = cache["personnel"].rename(columns={"cod_serv": "cod_serv_personnel"})
        fact = fact.merge(personnel_lookup, on=["cod_soc", "mat_pers"], how="left")

        if "cod_serv" not in fact.columns:
            fact["cod_serv"] = fact["cod_serv_personnel"]
        else:
            fact["cod_serv"] = fact["cod_serv"].fillna(fact["cod_serv_personnel"])
            fact.loc[fact["cod_serv"].isin(["", "UNK"]), "cod_serv"] = fact["cod_serv_personnel"]
        fact["cod_serv"] = fact["cod_serv"].fillna("UNK")

        fact = fact.merge(cache["service"], on=["cod_serv"], how="left")
        fact = fact.merge(cache["motif"], on=["code_m"], how="left")

        fact["personnel_key"] = self._to_int_keys(fact["personnel_key"])
        if "service_key" not in fact.columns:
            fact["service_key"] = 0
        fact["service_key"] = self._to_int_keys(fact["service_key"])
        fact["motif_conge_key"] = self._to_int_keys(fact["motif_conge_key"])

        insert_df = fact[
            [
                "date_justif_key",
                "personnel_key",
                "service_key",
                "motif_conge_key",
                "nb_justificatif",
                "cod_soc",
                "mat_pers",
                "num_dcng",
                "justif_ref",
                "date_justif",
            ]
        ].copy()

        return self._upsert_dataframe(
            df=insert_df,
            table_name="f_justificatif_conge",
            conflict_cols=["cod_soc", "mat_pers", "num_dcng", "justif_ref"],
            update_cols=[
                "date_justif_key",
                "personnel_key",
                "service_key",
                "motif_conge_key",
                "nb_justificatif",
                "date_justif",
                "updated_at",
            ],
        )

    def load_pointage_chunk(self, fact_df: pd.DataFrame) -> int:
        if fact_df is None or fact_df.empty:
            return 0

        cache = self._build_lookup_cache()
        fact = fact_df.copy()

        fact = fact.merge(
            cache["personnel"],
            on=["cod_soc", "mat_pers"],
            how="left",
            suffixes=("", "_personnel"),
        )
        fact["cod_serv"] = fact["cod_serv"].fillna(fact.get("cod_serv_personnel"))
        fact.loc[fact["cod_serv"].eq("UNK"), "cod_serv"] = fact.get("cod_serv_personnel")
        fact["cod_serv"] = fact["cod_serv"].fillna("UNK")

        fact = fact.merge(cache["service"], on=["cod_serv"], how="left")
        fact = fact.merge(cache["type_pointage"], on=["typ_point"], how="left")

        fact["personnel_key"] = self._to_int_keys(fact["personnel_key"])
        fact["service_key"] = self._to_int_keys(fact["service_key"])
        fact["type_pointage_key"] = self._to_int_keys(fact["type_pointage_key"])

        insert_df = fact[
            [
                "event_date",
                "date_key",
                "personnel_key",
                "service_key",
                "type_pointage_key",
                "nb_pointage",
                "ret_min",
                "duree_tot",
                "cod_soc",
                "mat_pers",
                "typ_point",
                "row_hash",
            ]
        ].copy()

        return self._upsert_dataframe(
            df=insert_df,
            table_name="f_pointage",
            conflict_cols=["cod_soc", "mat_pers", "event_date", "typ_point", "row_hash"],
            update_cols=[
                "date_key",
                "personnel_key",
                "service_key",
                "type_pointage_key",
                "nb_pointage",
                "ret_min",
                "duree_tot",
                "updated_at",
            ],
        )

    def load_retard_chunk(self, fact_df: pd.DataFrame) -> int:
        if fact_df is None or fact_df.empty:
            return 0

        cache = self._build_lookup_cache()
        fact = fact_df.copy()

        fact = fact.merge(
            cache["personnel"],
            on=["cod_soc", "mat_pers"],
            how="left",
            suffixes=("", "_personnel"),
        )
        fact["cod_serv"] = fact["cod_serv"].fillna(fact.get("cod_serv_personnel"))
        fact.loc[fact["cod_serv"].eq("UNK"), "cod_serv"] = fact.get("cod_serv_personnel")
        fact["cod_serv"] = fact["cod_serv"].fillna("UNK")

        fact = fact.merge(cache["service"], on=["cod_serv"], how="left")
        fact = fact.merge(cache["etat_retard"], on=["etat_retard"], how="left")

        fact["personnel_key"] = self._to_int_keys(fact["personnel_key"])
        fact["service_key"] = self._to_int_keys(fact["service_key"])
        fact["etat_retard_key"] = self._to_int_keys(fact["etat_retard_key"])

        insert_df = fact[
            [
                "event_date",
                "date_key",
                "personnel_key",
                "service_key",
                "etat_retard_key",
                "nb_retard",
                "duree_tot",
                "cod_soc",
                "mat_pers",
                "etat_retard",
                "row_hash",
            ]
        ].copy()

        return self._upsert_dataframe(
            df=insert_df,
            table_name="f_retard_journalier",
            conflict_cols=["cod_soc", "mat_pers", "event_date", "etat_retard", "row_hash"],
            update_cols=[
                "date_key",
                "personnel_key",
                "service_key",
                "etat_retard_key",
                "nb_retard",
                "duree_tot",
                "updated_at",
            ],
        )

    def run_quality_checks(self, quality_sql_file: Path, raise_on_failure: bool = True) -> list[dict[str, Any]]:
        sql_text = quality_sql_file.read_text(encoding="utf-8")
        with self.engine.connect() as conn:
            rows = conn.execute(text(sql_text)).mappings().all()

        checks = [dict(row) for row in rows]
        failed = [check for check in checks if not bool(check.get("passed"))]
        if failed and raise_on_failure:
            details = "; ".join(
                f"{item.get('check_name')} fail_count={item.get('fail_count')} details={item.get('details')}"
                for item in failed
            )
            raise RuntimeError(f"Quality checks failed: {details}")
        return checks

    def get_watermark(self) -> Watermark:
        query = text(
            """
            SELECT last_pointage_date, last_retard_date, last_success_at
            FROM etl_watermark
            WHERE pipeline_name = :pipeline_name
            """
        )
        with self.engine.connect() as conn:
            row = conn.execute(query, {"pipeline_name": self.pipeline_name}).mappings().first()

        if row is None:
            return Watermark(last_pointage_date=None, last_retard_date=None, last_success_at=None)
        return Watermark(
            last_pointage_date=row.get("last_pointage_date"),
            last_retard_date=row.get("last_retard_date"),
            last_success_at=row.get("last_success_at"),
        )

    def update_watermark(self, last_pointage_date: Any, last_retard_date: Any) -> None:
        query = text(
            """
            INSERT INTO etl_watermark (
                pipeline_name,
                last_pointage_date,
                last_retard_date,
                last_success_at,
                updated_at
            )
            VALUES (
                :pipeline_name,
                :last_pointage_date,
                :last_retard_date,
                NOW(),
                NOW()
            )
            ON CONFLICT (pipeline_name)
            DO UPDATE SET
                last_pointage_date = COALESCE(EXCLUDED.last_pointage_date, etl_watermark.last_pointage_date),
                last_retard_date = COALESCE(EXCLUDED.last_retard_date, etl_watermark.last_retard_date),
                last_success_at = NOW(),
                updated_at = NOW()
            """
        )
        with self.engine.begin() as conn:
            conn.execute(
                query,
                {
                    "pipeline_name": self.pipeline_name,
                    "last_pointage_date": last_pointage_date,
                    "last_retard_date": last_retard_date,
                },
            )

    def start_run_log(self) -> int:
        query = text(
            """
            INSERT INTO etl_run_log (pipeline_name, status, started_at)
            VALUES (:pipeline_name, 'RUNNING', NOW())
            RETURNING run_id
            """
        )
        with self.engine.begin() as conn:
            run_id = conn.execute(query, {"pipeline_name": self.pipeline_name}).scalar_one()
        return int(run_id)

    def finish_run_log(
        self,
        run_id: int,
        status: str,
        counts: dict[str, int],
        error_message: str | None = None,
    ) -> None:
        query = text(
            """
            UPDATE etl_run_log
            SET
                status = :status,
                finished_at = NOW(),
                rows_effectif = :rows_effectif,
                rows_demande_conge = :rows_demande_conge,
                rows_justif_conge = :rows_justif_conge,
                rows_pointage = :rows_pointage,
                rows_retard = :rows_retard,
                error_message = :error_message
            WHERE run_id = :run_id
            """
        )
        with self.engine.begin() as conn:
            conn.execute(
                query,
                {
                    "run_id": run_id,
                    "status": status,
                    "rows_effectif": counts.get("rows_effectif", 0),
                    "rows_demande_conge": counts.get("rows_demande_conge", 0),
                    "rows_justif_conge": counts.get("rows_justif_conge", 0),
                    "rows_pointage": counts.get("rows_pointage", 0),
                    "rows_retard": counts.get("rows_retard", 0),
                    "error_message": error_message,
                },
            )
