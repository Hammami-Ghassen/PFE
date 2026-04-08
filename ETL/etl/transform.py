from __future__ import annotations

import hashlib
from datetime import date
from typing import Dict, Iterable

import pandas as pd


DIMENSION_DEDUP_KEYS: dict[str, list[str]] = {
    "d_temps": ["date_key"],
    "d_personnel": ["cod_soc", "mat_pers"],
    "d_service": ["cod_serv"],
    "d_gouvernorat": ["cod_gouv"],
    "d_grade": ["cod_grad"],
    "d_etat_act": ["etat_act"],
    "d_sexe": ["sexe"],
    "d_motif_conge": ["code_m"],
    "d_statut_conge": ["status_code"],
    "d_type_pointage": ["typ_point"],
    "d_etat_retard": ["etat_retard"],
}


def _as_text(series: pd.Series, default: str = "UNK") -> pd.Series:
    cleaned = series.fillna(default).astype(str).str.strip()
    return cleaned.mask(cleaned == "", default)


def _as_date(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce").dt.date


def _as_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def _date_to_key(value: date | None) -> int:
    if value is None or pd.isna(value):
        return 0
    return int(value.strftime("%Y%m%d"))


def _build_time_dimension(date_values: Iterable[date | None]) -> pd.DataFrame:
    series = pd.Series(list(date_values), dtype="object")
    normalized = pd.to_datetime(series, errors="coerce").dropna().dt.date.drop_duplicates()
    if normalized.empty:
        return pd.DataFrame(
            columns=[
                "date_key",
                "full_date",
                "year_num",
                "quarter_num",
                "month_num",
                "month_name",
                "week_num",
                "day_num",
                "day_name",
                "is_weekend",
            ]
        )

    df = pd.DataFrame({"full_date": sorted(normalized.tolist())})
    dt = pd.to_datetime(df["full_date"])
    df["date_key"] = dt.dt.strftime("%Y%m%d").astype(int)
    df["year_num"] = dt.dt.year
    df["quarter_num"] = dt.dt.quarter
    df["month_num"] = dt.dt.month
    df["month_name"] = dt.dt.month_name()
    df["week_num"] = dt.dt.isocalendar().week.astype(int)
    df["day_num"] = dt.dt.day
    df["day_name"] = dt.dt.day_name()
    df["is_weekend"] = dt.dt.dayofweek >= 5
    return df


def _hash_row(values: list[str]) -> str:
    hasher = hashlib.md5()
    hasher.update("|".join(values).encode("utf-8"))
    return hasher.hexdigest()


def combine_dimension_batches(*batches: Dict[str, pd.DataFrame]) -> Dict[str, pd.DataFrame]:
    merged: Dict[str, pd.DataFrame] = {}
    for batch in batches:
        for table_name, df in batch.items():
            if df is None or df.empty:
                continue
            if table_name not in merged:
                merged[table_name] = df.copy()
            else:
                merged[table_name] = pd.concat([merged[table_name], df], ignore_index=True)

    for table_name, df in merged.items():
        dedup_keys = DIMENSION_DEDUP_KEYS.get(table_name)
        if dedup_keys:
            merged[table_name] = df.drop_duplicates(subset=dedup_keys).reset_index(drop=True)
        else:
            merged[table_name] = df.drop_duplicates().reset_index(drop=True)
    return merged


def transform_personnel_and_effectif(
    personnel_df: pd.DataFrame,
    references: Dict[str, pd.DataFrame],
    snapshot_date: date,
) -> Dict[str, Dict[str, pd.DataFrame] | pd.DataFrame]:
    df = personnel_df.copy()
    if df.empty:
        return {
            "dimensions": {
                "d_temps": _build_time_dimension([snapshot_date]),
                "d_personnel": pd.DataFrame(),
                "d_service": pd.DataFrame(),
                "d_gouvernorat": pd.DataFrame(),
                "d_grade": pd.DataFrame(),
                "d_etat_act": pd.DataFrame(),
                "d_sexe": pd.DataFrame(),
            },
            "fact": pd.DataFrame(),
        }

    df["cod_soc"] = _as_text(df["cod_soc"]) if "cod_soc" in df else "UNK"
    df["mat_pers"] = _as_text(df["mat_pers"])
    df["pren_pers"] = _as_text(df.get("pren_pers", pd.Series(dtype="object")), default="")
    df["nom_pers"] = _as_text(df.get("nom_pers", pd.Series(dtype="object")), default="")
    df["cod_serv"] = _as_text(df.get("cod_serv", pd.Series(dtype="object")))
    df["cod_gouv"] = _as_text(df.get("cod_gouv", pd.Series(dtype="object")))
    df["cod_grad"] = _as_text(df.get("cod_grad", pd.Series(dtype="object")))
    df["etat_act"] = _as_text(df.get("etat_act", pd.Series(dtype="object")))
    df["sexe"] = _as_text(df.get("sexe", pd.Series(dtype="object")))
    df["birth_date"] = _as_date(df.get("birth_date", pd.Series(dtype="object")))
    df["hire_date"] = _as_date(df.get("hire_date", pd.Series(dtype="object")))

    full_name = (df["pren_pers"] + " " + df["nom_pers"]).str.strip()
    df["full_name"] = full_name.mask(full_name == "", "Unknown")

    now_ts = pd.to_datetime(snapshot_date)
    birth_ts = pd.to_datetime(df["birth_date"], errors="coerce")
    hire_ts = pd.to_datetime(df["hire_date"], errors="coerce")

    age = ((now_ts - birth_ts).dt.days / 365.25).astype("float").round(0)
    anciennete = (now_ts - hire_ts).dt.days

    fact_effectif = pd.DataFrame(
        {
            "snapshot_date": snapshot_date,
            "snapshot_date_key": _date_to_key(snapshot_date),
            "cod_soc": df["cod_soc"],
            "mat_pers": df["mat_pers"],
            "cod_serv": df["cod_serv"],
            "cod_gouv": df["cod_gouv"],
            "cod_grad": df["cod_grad"],
            "etat_act": df["etat_act"],
            "sexe": df["sexe"],
            "nb_agent": 1,
            "age": age.where(age >= 0),
            "anciennete_jours": anciennete.where(anciennete >= 0),
        }
    ).drop_duplicates(subset=["snapshot_date_key", "cod_soc", "mat_pers"])

    etat_desc_map = {
        "0": "Actif",
        "1": "Suspendu",
        "5": "Cesse",
        "8": "Autre",
        "UNK": "Unknown etat actif",
    }

    sexe_desc_map = {
        "M": "Masculin",
        "F": "Feminin",
        "UNK": "Unknown sexe",
    }

    d_personnel = df[
        [
            "cod_soc",
            "mat_pers",
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
        ]
    ].copy()
    d_personnel["is_active"] = d_personnel["etat_act"].eq("0")

    service_ref = references.get("service", pd.DataFrame(columns=["cod_serv", "lib_serv"]))
    d_service = pd.concat(
        [
            service_ref[["cod_serv", "lib_serv"]].copy() if not service_ref.empty else pd.DataFrame(columns=["cod_serv", "lib_serv"]),
            pd.DataFrame({"cod_serv": df["cod_serv"].dropna().unique(), "lib_serv": None}),
        ],
        ignore_index=True,
    )
    d_service["cod_serv"] = _as_text(d_service["cod_serv"])
    d_service["lib_serv"] = d_service["lib_serv"].fillna("")
    d_service = d_service.drop_duplicates(subset=["cod_serv"])

    gouv_ref = references.get("gouvernorat", pd.DataFrame(columns=["cod_gouv", "lib_gouv"]))
    d_gouvernorat = pd.concat(
        [
            gouv_ref[["cod_gouv", "lib_gouv"]].copy() if not gouv_ref.empty else pd.DataFrame(columns=["cod_gouv", "lib_gouv"]),
            pd.DataFrame({"cod_gouv": df["cod_gouv"].dropna().unique(), "lib_gouv": None}),
        ],
        ignore_index=True,
    )
    d_gouvernorat["cod_gouv"] = _as_text(d_gouvernorat["cod_gouv"])
    d_gouvernorat["lib_gouv"] = d_gouvernorat["lib_gouv"].fillna("")
    d_gouvernorat = d_gouvernorat.drop_duplicates(subset=["cod_gouv"])

    grade_ref = references.get("grade", pd.DataFrame(columns=["cod_grad", "lib_grad"]))
    d_grade = pd.concat(
        [
            grade_ref[["cod_grad", "lib_grad"]].copy() if not grade_ref.empty else pd.DataFrame(columns=["cod_grad", "lib_grad"]),
            pd.DataFrame({"cod_grad": df["cod_grad"].dropna().unique(), "lib_grad": None}),
        ],
        ignore_index=True,
    )
    d_grade["cod_grad"] = _as_text(d_grade["cod_grad"])
    d_grade["lib_grad"] = d_grade["lib_grad"].fillna("")
    d_grade = d_grade.drop_duplicates(subset=["cod_grad"])

    d_etat_act = pd.DataFrame({"etat_act": sorted(df["etat_act"].dropna().unique())})
    d_etat_act["etat_act"] = _as_text(d_etat_act["etat_act"])
    d_etat_act["etat_act_desc"] = d_etat_act["etat_act"].map(etat_desc_map).fillna("Autre")

    d_sexe = pd.DataFrame({"sexe": sorted(df["sexe"].dropna().unique())})
    d_sexe["sexe"] = _as_text(d_sexe["sexe"])
    d_sexe["sexe_desc"] = d_sexe["sexe"].map(sexe_desc_map).fillna("Autre")

    dimensions = {
        "d_temps": _build_time_dimension([snapshot_date]),
        "d_personnel": d_personnel.drop_duplicates(subset=["cod_soc", "mat_pers"]),
        "d_service": d_service,
        "d_gouvernorat": d_gouvernorat,
        "d_grade": d_grade,
        "d_etat_act": d_etat_act,
        "d_sexe": d_sexe,
    }

    return {"dimensions": dimensions, "fact": fact_effectif}


def transform_demande_conge(
    demande_df: pd.DataFrame,
    motif_reference_df: pd.DataFrame | None = None,
) -> Dict[str, Dict[str, pd.DataFrame] | pd.DataFrame]:
    if demande_df.empty:
        return {
            "dimensions": {
                "d_temps": pd.DataFrame(),
                "d_motif_conge": pd.DataFrame(),
                "d_statut_conge": pd.DataFrame(),
            },
            "fact": pd.DataFrame(),
        }

    df = demande_df.copy()
    df["cod_soc"] = _as_text(df.get("cod_soc", pd.Series(dtype="object")))
    df["mat_pers"] = _as_text(df.get("mat_pers", pd.Series(dtype="object")))
    df["num_dcng"] = _as_text(df.get("num_dcng", pd.Series(dtype="object")))
    df["date_demande"] = _as_date(df.get("date_demande", pd.Series(dtype="object")))
    df["date_debut"] = _as_date(df.get("date_debut", pd.Series(dtype="object")))
    df["date_fin"] = _as_date(df.get("date_fin", pd.Series(dtype="object")))
    df["nbr_jours"] = _as_numeric(df.get("nbr_jours", pd.Series(dtype="object")))
    df["nbr_heure"] = _as_numeric(df.get("nbr_heure", pd.Series(dtype="object")))
    df["nbr_jours_cal"] = _as_numeric(df.get("nbr_jours_cal", pd.Series(dtype="object")))
    df["code_m"] = _as_text(df.get("code_m", pd.Series(dtype="object")))
    df["valid"] = _as_text(df.get("valid", pd.Series(dtype="object")))
    df["etat_cng"] = _as_text(df.get("etat_cng", pd.Series(dtype="object")))
    df["nat_cng"] = _as_text(df.get("nat_cng", pd.Series(dtype="object")))

    df.loc[df["date_demande"].isna(), "date_demande"] = df["date_debut"]
    df.loc[df["date_fin"].isna(), "date_fin"] = df["date_debut"]

    unknown_num = df["num_dcng"].eq("UNK")
    if unknown_num.any():
        fallback_hash = (
            df.loc[unknown_num, ["cod_soc", "mat_pers", "date_debut", "date_fin"]]
            .astype(str)
            .agg("|".join, axis=1)
            .apply(lambda x: _hash_row([x]))
        )
        df.loc[unknown_num, "num_dcng"] = "AUTO-" + fallback_hash

    df["status_code"] = df[["valid", "etat_cng", "nat_cng"]].astype(str).agg("|".join, axis=1)

    fact = pd.DataFrame(
        {
            "cod_soc": df["cod_soc"],
            "mat_pers": df["mat_pers"],
            "num_dcng": df["num_dcng"],
            "date_demande": df["date_demande"],
            "date_debut": df["date_debut"],
            "date_fin": df["date_fin"],
            "date_demande_key": df["date_demande"].map(_date_to_key),
            "date_debut_key": df["date_debut"].map(_date_to_key),
            "date_fin_key": df["date_fin"].map(_date_to_key),
            "code_m": df["code_m"],
            "status_code": df["status_code"],
            "nbr_jours": df["nbr_jours"],
            "nbr_heure": df["nbr_heure"],
            "nbr_jours_cal": df["nbr_jours_cal"],
            "nb_demande": 1,
        }
    ).drop_duplicates(subset=["cod_soc", "mat_pers", "num_dcng"])

    motif_ref = motif_reference_df if motif_reference_df is not None else pd.DataFrame(columns=["code_m", "lib_motif"])
    d_motif = pd.concat(
        [
            motif_ref[["code_m", "lib_motif"]].copy() if not motif_ref.empty else pd.DataFrame(columns=["code_m", "lib_motif"]),
            pd.DataFrame({"code_m": df["code_m"].dropna().unique(), "lib_motif": None}),
        ],
        ignore_index=True,
    )
    d_motif["code_m"] = _as_text(d_motif["code_m"])
    d_motif["lib_motif"] = d_motif["lib_motif"].fillna("")
    d_motif = d_motif.drop_duplicates(subset=["code_m"])

    d_statut = (
        df[["status_code", "valid", "etat_cng", "nat_cng"]]
        .drop_duplicates()
        .assign(statut_desc=lambda x: "VALID=" + x["valid"] + " ETAT=" + x["etat_cng"] + " NAT=" + x["nat_cng"])
    )

    d_temps = _build_time_dimension(
        pd.concat([df["date_demande"], df["date_debut"], df["date_fin"]], ignore_index=True).tolist()
    )

    return {
        "dimensions": {
            "d_temps": d_temps,
            "d_motif_conge": d_motif,
            "d_statut_conge": d_statut,
        },
        "fact": fact,
    }


def transform_justificatif_conge(justif_df: pd.DataFrame) -> Dict[str, Dict[str, pd.DataFrame] | pd.DataFrame]:
    if justif_df.empty:
        return {
            "dimensions": {
                "d_temps": pd.DataFrame(),
                "d_motif_conge": pd.DataFrame(),
            },
            "fact": pd.DataFrame(),
        }

    df = justif_df.copy()
    df["cod_soc"] = _as_text(df.get("cod_soc", pd.Series(dtype="object")))
    df["mat_pers"] = _as_text(df.get("mat_pers", pd.Series(dtype="object")))
    df["num_dcng"] = _as_text(df.get("num_dcng", pd.Series(dtype="object")))
    df["date_justif"] = _as_date(df.get("date_justif", pd.Series(dtype="object")))
    df["code_m"] = _as_text(df.get("code_m", pd.Series(dtype="object")))
    df["justif_ref"] = _as_text(df.get("justif_ref", pd.Series(dtype="object")))

    missing_ref = df["justif_ref"].eq("UNK")
    if missing_ref.any():
        fallback = (
            df.loc[missing_ref, ["cod_soc", "mat_pers", "num_dcng", "date_justif"]]
            .astype(str)
            .agg("|".join, axis=1)
            .apply(lambda x: _hash_row([x]))
        )
        df.loc[missing_ref, "justif_ref"] = "AUTO-" + fallback

    fact = pd.DataFrame(
        {
            "cod_soc": df["cod_soc"],
            "mat_pers": df["mat_pers"],
            "num_dcng": df["num_dcng"],
            "justif_ref": df["justif_ref"],
            "date_justif": df["date_justif"],
            "date_justif_key": df["date_justif"].map(_date_to_key),
            "code_m": df["code_m"],
            "nb_justificatif": 1,
        }
    ).drop_duplicates(subset=["cod_soc", "mat_pers", "num_dcng", "justif_ref"])

    d_motif = pd.DataFrame({"code_m": sorted(df["code_m"].dropna().unique())})
    d_motif["code_m"] = _as_text(d_motif["code_m"])
    d_motif["lib_motif"] = ""

    return {
        "dimensions": {
            "d_temps": _build_time_dimension(df["date_justif"].tolist()),
            "d_motif_conge": d_motif,
        },
        "fact": fact,
    }


def transform_pointage_chunk(pointage_chunk: pd.DataFrame) -> Dict[str, Dict[str, pd.DataFrame] | pd.DataFrame]:
    if pointage_chunk.empty:
        return {
            "dimensions": {
                "d_temps": pd.DataFrame(),
                "d_type_pointage": pd.DataFrame(),
                "d_service": pd.DataFrame(),
            },
            "fact": pd.DataFrame(),
        }

    df = pointage_chunk.copy()
    df["cod_soc"] = _as_text(df.get("cod_soc", pd.Series(dtype="object")))
    df["mat_pers"] = _as_text(df.get("mat_pers", pd.Series(dtype="object")))
    df["cod_serv"] = _as_text(df.get("cod_serv", pd.Series(dtype="object")))
    df["event_date"] = _as_date(df.get("event_date", pd.Series(dtype="object")))
    df["typ_point"] = _as_text(df.get("typ_point", pd.Series(dtype="object")))
    df["ret_min"] = _as_numeric(df.get("ret_min", pd.Series(dtype="object")))
    df["duree_tot"] = _as_numeric(df.get("duree_tot", pd.Series(dtype="object")))

    df = df[df["event_date"].notna() & df["mat_pers"].notna()].copy()
    if df.empty:
        return {
            "dimensions": {
                "d_temps": pd.DataFrame(),
                "d_type_pointage": pd.DataFrame(),
                "d_service": pd.DataFrame(),
            },
            "fact": pd.DataFrame(),
        }

    df = df.drop_duplicates(subset=["cod_soc", "mat_pers", "event_date", "typ_point", "ret_min", "duree_tot"])
    df["date_key"] = df["event_date"].map(_date_to_key)
    df["row_hash"] = df[["cod_soc", "mat_pers", "event_date", "typ_point", "ret_min", "duree_tot"]].astype(str).agg(
        lambda values: _hash_row(list(values)), axis=1
    )

    fact = pd.DataFrame(
        {
            "event_date": df["event_date"],
            "date_key": df["date_key"],
            "cod_soc": df["cod_soc"],
            "mat_pers": df["mat_pers"],
            "cod_serv": df["cod_serv"],
            "typ_point": df["typ_point"],
            "ret_min": df["ret_min"],
            "duree_tot": df["duree_tot"],
            "row_hash": df["row_hash"],
            "nb_pointage": 1,
        }
    )

    point_desc_map = {
        "E": "Entree",
        "S": "Sortie",
        "UNK": "Unknown type pointage",
    }
    d_type = pd.DataFrame({"typ_point": sorted(df["typ_point"].dropna().unique())})
    d_type["typ_point"] = _as_text(d_type["typ_point"])
    d_type["type_pointage_desc"] = d_type["typ_point"].map(point_desc_map).fillna("Autre")

    d_service = pd.DataFrame({"cod_serv": sorted(df["cod_serv"].dropna().unique())})
    d_service["cod_serv"] = _as_text(d_service["cod_serv"])
    d_service["lib_serv"] = ""

    return {
        "dimensions": {
            "d_temps": _build_time_dimension(df["event_date"].tolist()),
            "d_type_pointage": d_type,
            "d_service": d_service,
        },
        "fact": fact,
    }


def transform_retard_chunk(retard_chunk: pd.DataFrame) -> Dict[str, Dict[str, pd.DataFrame] | pd.DataFrame]:
    if retard_chunk.empty:
        return {
            "dimensions": {
                "d_temps": pd.DataFrame(),
                "d_etat_retard": pd.DataFrame(),
                "d_service": pd.DataFrame(),
            },
            "fact": pd.DataFrame(),
        }

    df = retard_chunk.copy()
    df["cod_soc"] = _as_text(df.get("cod_soc", pd.Series(dtype="object")))
    df["mat_pers"] = _as_text(df.get("mat_pers", pd.Series(dtype="object")))
    df["cod_serv"] = _as_text(df.get("cod_serv", pd.Series(dtype="object")))
    df["event_date"] = _as_date(df.get("event_date", pd.Series(dtype="object")))
    df["etat_retard"] = _as_text(df.get("etat_retard", pd.Series(dtype="object")))
    df["duree_tot"] = _as_numeric(df.get("duree_tot", pd.Series(dtype="object")))

    df = df[df["event_date"].notna() & df["mat_pers"].notna()].copy()
    if df.empty:
        return {
            "dimensions": {
                "d_temps": pd.DataFrame(),
                "d_etat_retard": pd.DataFrame(),
                "d_service": pd.DataFrame(),
            },
            "fact": pd.DataFrame(),
        }

    df = df.drop_duplicates(subset=["cod_soc", "mat_pers", "event_date", "etat_retard", "duree_tot"])
    df["date_key"] = df["event_date"].map(_date_to_key)
    df["row_hash"] = df[["cod_soc", "mat_pers", "event_date", "etat_retard", "duree_tot"]].astype(str).agg(
        lambda values: _hash_row(list(values)), axis=1
    )

    fact = pd.DataFrame(
        {
            "event_date": df["event_date"],
            "date_key": df["date_key"],
            "cod_soc": df["cod_soc"],
            "mat_pers": df["mat_pers"],
            "cod_serv": df["cod_serv"],
            "etat_retard": df["etat_retard"],
            "duree_tot": df["duree_tot"],
            "row_hash": df["row_hash"],
            "nb_retard": 1,
        }
    )

    etat_retard_desc_map = {
        "V": "Valide",
        "UNK": "Unknown etat retard",
    }

    d_etat = pd.DataFrame({"etat_retard": sorted(df["etat_retard"].dropna().unique())})
    d_etat["etat_retard"] = _as_text(d_etat["etat_retard"])
    d_etat["etat_retard_desc"] = d_etat["etat_retard"].map(etat_retard_desc_map).fillna("Autre")

    d_service = pd.DataFrame({"cod_serv": sorted(df["cod_serv"].dropna().unique())})
    d_service["cod_serv"] = _as_text(d_service["cod_serv"])
    d_service["lib_serv"] = ""

    return {
        "dimensions": {
            "d_temps": _build_time_dimension(df["event_date"].tolist()),
            "d_etat_retard": d_etat,
            "d_service": d_service,
        },
        "fact": fact,
    }
