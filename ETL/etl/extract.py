from __future__ import annotations

import logging
from datetime import date
from typing import Dict, Generator, Iterable

import pandas as pd
from sqlalchemy import Engine, text

LOGGER = logging.getLogger(__name__)


class SourceExtractor:
    def __init__(self, engine: Engine, chunk_size: int = 100000, schema: str = "public") -> None:
        self.engine = engine
        self.chunk_size = chunk_size
        self.schema = schema

    def _qualified_table(self, table_name: str) -> str:
        return f'"{self.schema}"."{table_name}"'

    def table_exists(self, table_name: str) -> bool:
        query = text(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = :schema
                  AND table_name = :table_name
            )
            """
        )
        with self.engine.connect() as conn:
            return bool(conn.execute(query, {"schema": self.schema, "table_name": table_name}).scalar())

    def table_columns(self, table_name: str) -> set[str]:
        query = text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = :schema
              AND table_name = :table_name
            """
        )
        with self.engine.connect() as conn:
            rows = conn.execute(query, {"schema": self.schema, "table_name": table_name}).fetchall()
        return {row[0] for row in rows}

    @staticmethod
    def _pick_column(columns: set[str], candidates: Iterable[str]) -> str | None:
        for candidate in candidates:
            if candidate in columns:
                return candidate
        return None

    def _col_expr(self, columns: set[str], candidates: Iterable[str], alias: str) -> str:
        selected = self._pick_column(columns, candidates)
        if selected is None:
            return f"NULL::TEXT AS {alias}"
        return f'"{selected}"::TEXT AS {alias}'

    def _read_df(self, sql_text: str, params: dict | None = None) -> pd.DataFrame:
        return pd.read_sql_query(text(sql_text), self.engine, params=params)

    def _read_df_in_chunks(
        self,
        sql_text: str,
        params: dict | None = None,
    ) -> Generator[pd.DataFrame, None, None]:
        chunk_iterator = pd.read_sql_query(
            text(sql_text),
            self.engine,
            params=params,
            chunksize=self.chunk_size,
        )
        for chunk in chunk_iterator:
            yield chunk

    def extract_reference_table(
        self,
        table_name: str,
        code_candidates: list[str],
        label_candidates: list[str],
        code_alias: str,
        label_alias: str,
    ) -> pd.DataFrame:
        if not self.table_exists(table_name):
            LOGGER.warning("Reference table %s not found in schema %s", table_name, self.schema)
            return pd.DataFrame(columns=[code_alias, label_alias])

        columns = self.table_columns(table_name)
        sql_query = f"""
            SELECT
                {self._col_expr(columns, code_candidates, code_alias)},
                {self._col_expr(columns, label_candidates, label_alias)}
            FROM {self._qualified_table(table_name)}
        """
        df = self._read_df(sql_query)
        if df.empty:
            return pd.DataFrame(columns=[code_alias, label_alias])

        df[code_alias] = df[code_alias].fillna("UNK").astype(str).str.strip()
        df[label_alias] = df[label_alias].fillna("").astype(str).str.strip()
        df = df[df[code_alias] != ""]
        return df.drop_duplicates(subset=[code_alias]).reset_index(drop=True)

    def extract_reference_tables(self) -> Dict[str, pd.DataFrame]:
        return {
            "service": self.extract_reference_table(
                table_name="SERVICE",
                code_candidates=["COD_SERV", "CODE_SERV", "COD_SERVICE"],
                label_candidates=["LIB_SERV", "LIB_SERVICE", "DES_SERV"],
                code_alias="cod_serv",
                label_alias="lib_serv",
            ),
            "gouvernorat": self.extract_reference_table(
                table_name="GOUVERNORAT",
                code_candidates=["COD_GOUV", "CODE_GOUV"],
                label_candidates=["LIB_GOUV", "LIB_GOUVERNORAT", "DES_GOUV"],
                code_alias="cod_gouv",
                label_alias="lib_gouv",
            ),
            "grade": self.extract_reference_table(
                table_name="GRADE",
                code_candidates=["COD_GRAD", "CODE_GRAD"],
                label_candidates=["LIB_GRAD", "LIB_GRADE", "DES_GRAD"],
                code_alias="cod_grad",
                label_alias="lib_grad",
            ),
            "motif_conge": self.extract_reference_table(
                table_name="MOTIF_J",
                code_candidates=["CODE_M", "COD_M", "COD_MOTIF"],
                label_candidates=["LIB_MOTIF", "LIB_J", "DES_MOTIF"],
                code_alias="code_m",
                label_alias="lib_motif",
            ),
        }

    def extract_personnel(self) -> pd.DataFrame:
        table_name = "PERSONNEL"
        if not self.table_exists(table_name):
            raise RuntimeError(f"Source table {table_name} not found in schema {self.schema}")

        columns = self.table_columns(table_name)
        sql_query = f"""
            SELECT
                {self._col_expr(columns, ["COD_SOC"], "cod_soc")},
                {self._col_expr(columns, ["MAT_PERS"], "mat_pers")},
                {self._col_expr(columns, ["PREN_PERS", "PRENOM", "FIRST_NAME"], "pren_pers")},
                {self._col_expr(columns, ["NOM_PERS", "NOM", "LAST_NAME"], "nom_pers")},
                {self._col_expr(columns, ["COD_SERV", "CODE_SERV", "COD_SERVICE"], "cod_serv")},
                {self._col_expr(columns, ["COD_GOUV", "CODE_GOUV"], "cod_gouv")},
                {self._col_expr(columns, ["COD_GRAD", "CODE_GRAD"], "cod_grad")},
                {self._col_expr(columns, ["ETAT_ACT", "ETAT"], "etat_act")},
                {self._col_expr(columns, ["SEXE", "GENRE"], "sexe")},
                {self._col_expr(columns, ["DAT_NAIS", "DATE_NAIS", "DAT_NAISS"], "birth_date")},
                {self._col_expr(columns, ["DAT_ENTR", "DATE_ENTR", "DAT_RECRUT", "DATE_RECRUT"], "hire_date")}
            FROM {self._qualified_table(table_name)}
        """
        df = self._read_df(sql_query)
        LOGGER.info("Extracted %s personnel rows", len(df))
        return df

    def extract_demande_conge(self) -> pd.DataFrame:
        table_name = "DEM_CNG"
        if not self.table_exists(table_name):
            raise RuntimeError(f"Source table {table_name} not found in schema {self.schema}")

        columns = self.table_columns(table_name)
        sql_query = f"""
            SELECT
                {self._col_expr(columns, ["COD_SOC"], "cod_soc")},
                {self._col_expr(columns, ["MAT_PERS"], "mat_pers")},
                {self._col_expr(columns, ["NUM_DCNG", "NUM_CNG", "NUM_DEM_CNG"], "num_dcng")},
                {self._col_expr(columns, ["DAT_DEM", "DATE_DEM", "DAT_CNG"], "date_demande")},
                {self._col_expr(columns, ["DAT_DEBUT", "DATE_DEBUT"], "date_debut")},
                {self._col_expr(columns, ["DAT_FIN", "DATE_FIN"], "date_fin")},
                {self._col_expr(columns, ["NBR_JOURS"], "nbr_jours")},
                {self._col_expr(columns, ["NBR_HEURE", "NBR_H"], "nbr_heure")},
                {self._col_expr(columns, ["NBR_JOURS_CAL", "NBR_J_CAL"], "nbr_jours_cal")},
                {self._col_expr(columns, ["CODE_M", "COD_M", "COD_MOTIF"], "code_m")},
                {self._col_expr(columns, ["VALID"], "valid")},
                {self._col_expr(columns, ["ETAT_CNG"], "etat_cng")},
                {self._col_expr(columns, ["NAT_CNG", "NATURE_CNG"], "nat_cng")}
            FROM {self._qualified_table(table_name)}
        """
        df = self._read_df(sql_query)
        LOGGER.info("Extracted %s demande_conge rows", len(df))
        return df

    def extract_justificatif_conge(self) -> pd.DataFrame:
        table_name = "JUSTIF_DEM_CNG"
        if not self.table_exists(table_name):
            LOGGER.warning("Source table %s not found, justificatif fact will be skipped", table_name)
            return pd.DataFrame(
                columns=[
                    "cod_soc",
                    "mat_pers",
                    "num_dcng",
                    "date_justif",
                    "justif_ref",
                    "code_m",
                ]
            )

        columns = self.table_columns(table_name)
        sql_query = f"""
            SELECT
                {self._col_expr(columns, ["COD_SOC"], "cod_soc")},
                {self._col_expr(columns, ["MAT_PERS"], "mat_pers")},
                {self._col_expr(columns, ["NUM_DCNG", "NUM_CNG", "NUM_DEM_CNG"], "num_dcng")},
                {self._col_expr(columns, ["DAT_JUSTIF", "DATE_JUSTIF", "DAT_SAISIE"], "date_justif")},
                {self._col_expr(columns, ["NUM_JUSTIF", "NUM_DOC", "REF_DOC", "ID_JUSTIF"], "justif_ref")},
                {self._col_expr(columns, ["CODE_M", "COD_M", "COD_MOTIF"], "code_m")}
            FROM {self._qualified_table(table_name)}
        """
        df = self._read_df(sql_query)
        LOGGER.info("Extracted %s justificatif_conge rows", len(df))
        return df

    def iter_pointage(self, start_date: date | None = None) -> Generator[pd.DataFrame, None, None]:
        table_name = "POINTER"
        if not self.table_exists(table_name):
            raise RuntimeError(f"Source table {table_name} not found in schema {self.schema}")

        columns = self.table_columns(table_name)
        date_column = self._pick_column(columns, ["DATE_POINT", "DAT_POINT"])
        where_clause = ""
        params: dict = {}
        if start_date is not None and date_column is not None:
            where_clause = f'WHERE "{date_column}" >= :start_date'
            params["start_date"] = start_date

        sql_query = f"""
            SELECT
                {self._col_expr(columns, ["COD_SOC"], "cod_soc")},
                {self._col_expr(columns, ["MAT_PERS"], "mat_pers")},
                {self._col_expr(columns, ["COD_SERV", "CODE_SERV"], "cod_serv")},
                {self._col_expr(columns, ["DATE_POINT", "DAT_POINT"], "event_date")},
                {self._col_expr(columns, ["TYP_POINT", "TYPE_POINT"], "typ_point")},
                {self._col_expr(columns, ["RET_MIN", "RETARD_MIN", "DUREE_RETARD"], "ret_min")},
                {self._col_expr(columns, ["DUREE_TOT", "DUREE_M", "DUREE_H"], "duree_tot")}
            FROM {self._qualified_table(table_name)}
            {where_clause}
        """

        for chunk in self._read_df_in_chunks(sql_query, params=params):
            LOGGER.info("Extracted pointage chunk with %s rows", len(chunk))
            yield chunk

    def iter_retard_journalier(self, start_date: date | None = None) -> Generator[pd.DataFrame, None, None]:
        table_name = "RETARD_JOURNEE"
        if not self.table_exists(table_name):
            raise RuntimeError(f"Source table {table_name} not found in schema {self.schema}")

        columns = self.table_columns(table_name)
        date_column = self._pick_column(columns, ["DAT_POINT", "DATE_POINT"])
        where_clause = ""
        params: dict = {}
        if start_date is not None and date_column is not None:
            where_clause = f'WHERE "{date_column}" >= :start_date'
            params["start_date"] = start_date

        sql_query = f"""
            SELECT
                {self._col_expr(columns, ["COD_SOC"], "cod_soc")},
                {self._col_expr(columns, ["MAT_PERS"], "mat_pers")},
                {self._col_expr(columns, ["COD_SERV", "CODE_SERV"], "cod_serv")},
                {self._col_expr(columns, ["DAT_POINT", "DATE_POINT"], "event_date")},
                {self._col_expr(columns, ["ETAT_RETARD", "ETAT", "ETAT_ACT"], "etat_retard")},
                {self._col_expr(columns, ["DUREE_TOT", "DUREE_RETARD", "RETARD_MIN"], "duree_tot")}
            FROM {self._qualified_table(table_name)}
            {where_clause}
        """

        for chunk in self._read_df_in_chunks(sql_query, params=params):
            LOGGER.info("Extracted retard chunk with %s rows", len(chunk))
            yield chunk
