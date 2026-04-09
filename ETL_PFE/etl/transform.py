import pandas as pd
import numpy as np
from etl.config import SNAPSHOT_DATE

def clean_text(series: pd.Series) -> pd.Series:
    return (
        series.astype("string")
        .str.strip()
        .replace({"": pd.NA, "nan": pd.NA, "None": pd.NA})
    )

def parse_duration_to_minutes(value):
    if pd.isna(value):
        return 0.0
    s = str(value).strip().lower()
    if s == "":
        return 0.0
    if s.replace(".", "", 1).isdigit():
        return float(s)
    if "h" in s and "m" in s:
        h = s.split("h")[0]
        m = s.split("h")[1].replace("m", "")
        return float(h) * 60 + float(m)
    if s.endswith("h"):
        return float(s.replace("h", "")) * 60
    if s.endswith("m"):
        return float(s.replace("m", ""))
    return 0.0

def build_dimensions(personnel, dem_cng, pointer):
    d_service = (
        personnel[["COD_SERV"]]
        .assign(COD_SERV=lambda x: clean_text(x["COD_SERV"]))
        .dropna()
        .drop_duplicates()
        .rename(columns={"COD_SERV": "code_service"})
    )
    d_service["libelle_service"] = d_service["code_service"]

    d_gouvernorat = (
        personnel[["COD_GOUV"]]
        .assign(COD_GOUV=lambda x: clean_text(x["COD_GOUV"]))
        .dropna()
        .drop_duplicates()
        .rename(columns={"COD_GOUV": "code_gouvernorat"})
    )
    d_gouvernorat["libelle_gouvernorat"] = d_gouvernorat["code_gouvernorat"]

    d_grade = (
        personnel[["COD_GRAD"]]
        .assign(COD_GRAD=lambda x: clean_text(x["COD_GRAD"]))
        .dropna()
        .drop_duplicates()
        .rename(columns={"COD_GRAD": "code_grade"})
    )
    d_grade["libelle_grade"] = d_grade["code_grade"]

    d_etat_act = (
        personnel[["ETAT_ACT"]]
        .assign(ETAT_ACT=lambda x: clean_text(x["ETAT_ACT"]))
        .dropna()
        .drop_duplicates()
        .rename(columns={"ETAT_ACT": "code_etat_act"})
    )
    d_etat_act["libelle_etat_act"] = d_etat_act["code_etat_act"]

    d_sexe = (
        personnel[["SEXE"]]
        .assign(SEXE=lambda x: clean_text(x["SEXE"]).str.upper())
        .dropna()
        .drop_duplicates()
        .rename(columns={"SEXE": "code_sexe"})
    )
    d_sexe["libelle_sexe"] = d_sexe["code_sexe"].map({"M": "Masculin", "F": "Feminin"}).fillna("Non defini")

    d_personnel = personnel.copy()
    for col in ["MAT_PERS", "NOM_PERS", "PREN_PERS", "COD_SERV", "COD_GOUV", "COD_GRAD", "ETAT_ACT", "SEXE"]:
        d_personnel[col] = clean_text(d_personnel[col])
    d_personnel["SEXE"] = d_personnel["SEXE"].str.upper()

    d_personnel = (
        d_personnel[[
            "MAT_PERS", "NOM_PERS", "PREN_PERS", "DAT_NAIS", "DAT_EMB",
            "COD_SERV", "COD_GOUV", "COD_GRAD", "ETAT_ACT", "SEXE"
        ]]
        .dropna(subset=["MAT_PERS"])
        .drop_duplicates(subset=["MAT_PERS"])
        .rename(columns={
            "MAT_PERS": "matricule",
            "NOM_PERS": "nom",
            "PREN_PERS": "prenom",
            "DAT_NAIS": "date_naissance",
            "DAT_EMB": "date_recrutement",
            "COD_SERV": "code_service",
            "COD_GOUV": "code_gouvernorat",
            "COD_GRAD": "code_grade",
            "ETAT_ACT": "code_etat_act",
            "SEXE": "code_sexe",
        })
    )

    d_motif_conge = (
        dem_cng[["CODE_M"]]
        .assign(CODE_M=lambda x: clean_text(x["CODE_M"]))
        .dropna()
        .drop_duplicates()
        .rename(columns={"CODE_M": "code_motif_conge"})
    )
    d_motif_conge["libelle_motif_conge"] = d_motif_conge["code_motif_conge"]

    d_statut_conge = dem_cng[["VALID", "ETAT_CNG", "NAT_CNG"]].copy()
    for col in ["VALID", "ETAT_CNG", "NAT_CNG"]:
        d_statut_conge[col] = clean_text(d_statut_conge[col])
    d_statut_conge = d_statut_conge.drop_duplicates().rename(columns={
        "VALID": "valid_code",
        "ETAT_CNG": "etat_cng_code",
        "NAT_CNG": "nat_cng_code",
    })
    d_statut_conge["libelle_statut"] = (
        "VALID=" + d_statut_conge["valid_code"].fillna("NULL") +
        " | ETAT_CNG=" + d_statut_conge["etat_cng_code"].fillna("NULL") +
        " | NAT_CNG=" + d_statut_conge["nat_cng_code"].fillna("NULL")
    )

    d_type_pointage = (
        pointer[["TYP_POINT"]]
        .assign(TYP_POINT=lambda x: clean_text(x["TYP_POINT"]).str.upper())
        .dropna()
        .drop_duplicates()
        .rename(columns={"TYP_POINT": "code_type_pointage"})
    )
    d_type_pointage["libelle_type_pointage"] = d_type_pointage["code_type_pointage"].map({
        "E": "Entree", "S": "Sortie"
    }).fillna("Autre")

    d_etat_retard = pd.DataFrame([{
        "code_etat_retard": "RETARD",
        "libelle_etat_retard": "Retard constate"
    }])

    dates = pd.concat([
        pd.to_datetime(dem_cng["DAT_DEBUT"], errors="coerce"),
        pd.to_datetime(dem_cng["DAT_FIN"], errors="coerce"),
        pd.to_datetime(pointer["DATE_POINT"], errors="coerce"),
    ]).dropna()

    d_temps = pd.DataFrame({"date_complete": pd.date_range(dates.min(), dates.max(), freq="D")})
    d_temps["jour"] = d_temps["date_complete"].dt.day
    d_temps["mois"] = d_temps["date_complete"].dt.month
    d_temps["trimestre"] = d_temps["date_complete"].dt.quarter
    d_temps["annee"] = d_temps["date_complete"].dt.year
    d_temps["semaine_annee"] = d_temps["date_complete"].dt.isocalendar().week.astype(int)
    d_temps["nom_jour"] = d_temps["date_complete"].dt.day_name()
    d_temps["nom_mois"] = d_temps["date_complete"].dt.month_name()
    d_temps["est_weekend"] = d_temps["date_complete"].dt.weekday >= 5

    return {
        "d_temps": d_temps,
        "d_service": d_service,
        "d_gouvernorat": d_gouvernorat,
        "d_grade": d_grade,
        "d_etat_act": d_etat_act,
        "d_sexe": d_sexe,
        "d_personnel": d_personnel,
        "d_motif_conge": d_motif_conge,
        "d_statut_conge": d_statut_conge,
        "d_type_pointage": d_type_pointage,
        "d_etat_retard": d_etat_retard,
    }

def build_fact_effectif(personnel):
    df = personnel.copy()
    for col in ["MAT_PERS", "COD_SERV", "COD_GOUV", "COD_GRAD", "ETAT_ACT", "SEXE"]:
        df[col] = clean_text(df[col])

    df["DAT_NAIS"] = pd.to_datetime(df["DAT_NAIS"], errors="coerce")
    df["DAT_EMB"] = pd.to_datetime(df["DAT_EMB"], errors="coerce")
    snapshot = pd.to_datetime(SNAPSHOT_DATE)

    fact = pd.DataFrame({
        "snapshot_date": snapshot,
        "matricule": df["MAT_PERS"],
        "code_service": df["COD_SERV"],
        "code_gouvernorat": df["COD_GOUV"],
        "code_grade": df["COD_GRAD"],
        "code_etat_act": df["ETAT_ACT"],
        "code_sexe": df["SEXE"],
        "nb_agent": 1,
        "age": ((snapshot - df["DAT_NAIS"]).dt.days / 365.25).round().astype("Int64"),
        "anciennete_jours": (snapshot - df["DAT_EMB"]).dt.days.astype("Int64"),
    })
    return fact.dropna(subset=["matricule"]).drop_duplicates(subset=["snapshot_date", "matricule"])

def build_fact_conge(dem_cng, justif, personnel):
    dem = dem_cng.copy()
    for col in ["COD_SOC", "MAT_PERS", "NUM_DCNG", "CODE_M", "VALID", "ETAT_CNG", "NAT_CNG"]:
        dem[col] = clean_text(dem[col])

    dem["DAT_DEBUT"] = pd.to_datetime(dem["DAT_DEBUT"], errors="coerce")
    dem["DAT_FIN"] = pd.to_datetime(dem["DAT_FIN"], errors="coerce")
    dem = dem.drop_duplicates(subset=["COD_SOC", "MAT_PERS", "NUM_DCNG"])

    j = justif.copy()
    for col in ["COD_SOC", "MAT_PERS", "NUM_DCNG"]:
        j[col] = clean_text(j[col])

    j = (
        j.groupby(["COD_SOC", "MAT_PERS", "NUM_DCNG"], dropna=False)
        .size()
        .reset_index(name="nb_justificatifs")
    )

    pers = personnel.copy()
    pers["MAT_PERS"] = clean_text(pers["MAT_PERS"])
    pers["COD_SERV"] = clean_text(pers["COD_SERV"])
    pers = pers[["MAT_PERS", "COD_SERV"]].drop_duplicates(subset=["MAT_PERS"])

    fact = dem.merge(j, how="left", on=["COD_SOC", "MAT_PERS", "NUM_DCNG"])
    fact = fact.merge(pers, how="left", on="MAT_PERS")
    fact["nb_justificatifs"] = fact["nb_justificatifs"].fillna(0).astype(int)
    fact["est_justifie"] = fact["nb_justificatifs"] > 0

    fact = fact.rename(columns={
        "COD_SOC": "code_soc",
        "NUM_DCNG": "num_demande_conge",
        "DAT_DEBUT": "date_debut",
        "DAT_FIN": "date_fin",
        "MAT_PERS": "matricule",
        "COD_SERV": "code_service",
        "CODE_M": "code_motif_conge",
        "VALID": "valid_code",
        "ETAT_CNG": "etat_cng_code",
        "NAT_CNG": "nat_cng_code",
        "NBR_JOURS": "nbr_jours",
        "NBR_HEURE": "nbr_heures",
        "NBR_JOURS_CAL": "nbr_jours_cal",
    })

    fact["nb_demande"] = 1
    return fact[[
        "code_soc", "num_demande_conge", "date_debut", "date_fin",
        "matricule", "code_service",
        "code_motif_conge", "valid_code", "etat_cng_code", "nat_cng_code",
        "nb_demande", "nbr_jours", "nbr_heures", "nbr_jours_cal",
        "est_justifie", "nb_justificatifs"
    ]]

def build_fact_pointage_retard(pointer, retard, personnel):
    pt = pointer.copy()
    pt["MAT_PERS"] = clean_text(pt["MAT_PERS"])
    pt["TYP_POINT"] = clean_text(pt["TYP_POINT"]).str.upper()
    pt["DATE_POINT"] = pd.to_datetime(pt["DATE_POINT"], errors="coerce")
    pt["DUREE_TOT_MIN"] = pt["DUREE_TOT"].apply(parse_duration_to_minutes)

    pt = (
        pt.groupby(["MAT_PERS", "DATE_POINT", "TYP_POINT"], dropna=False)
        .agg(nb_pointage=("MAT_PERS", "size"), duree_tot=("DUREE_TOT_MIN", "sum"))
        .reset_index()
    )

    rt = retard.copy()
    rt["MAT_PERS"] = clean_text(rt["MAT_PERS"])
    rt["DAT_POINT"] = pd.to_datetime(rt["DAT_POINT"], errors="coerce")
    rt["DUREE_RETARD_MIN"] = rt["DUREE_TOT"].apply(parse_duration_to_minutes)
    rt = (
        rt.groupby(["MAT_PERS", "DAT_POINT"], dropna=False)
        .agg(nb_retard=("MAT_PERS", "size"), ret_min=("DUREE_RETARD_MIN", "sum"))
        .reset_index()
    )

    pers = personnel.copy()
    pers["MAT_PERS"] = clean_text(pers["MAT_PERS"])
    pers["COD_SERV"] = clean_text(pers["COD_SERV"])
    pers = pers[["MAT_PERS", "COD_SERV"]].drop_duplicates(subset=["MAT_PERS"])

    fact = pt.merge(rt, how="left", left_on=["MAT_PERS", "DATE_POINT"], right_on=["MAT_PERS", "DAT_POINT"])
    fact = fact.merge(pers, how="left", on="MAT_PERS")

    fact["nb_retard"] = fact["nb_retard"].fillna(0).astype(int)
    fact["ret_min"] = fact["ret_min"].fillna(0.0)
    fact["est_retard"] = fact["nb_retard"] > 0
    fact["code_etat_retard"] = np.where(fact["est_retard"], "RETARD", pd.NA)

    fact = fact.rename(columns={
        "DATE_POINT": "date_point",
        "MAT_PERS": "matricule",
        "COD_SERV": "code_service",
        "TYP_POINT": "code_type_pointage",
    })

    return fact[[
        "date_point", "matricule", "code_service", "code_type_pointage",
        "code_etat_retard", "nb_pointage", "nb_retard", "est_retard", "ret_min", "duree_tot"
    ]]

def run_transform(extracted_data: dict) -> dict:
    personnel = extracted_data["personnel"]
    dem_cng = extracted_data["dem_cng"]
    justif = extracted_data["justif_dem_cng"]
    pointer = extracted_data["pointer"]
    retard = extracted_data["retard_journee"]

    dims = build_dimensions(personnel, dem_cng, pointer)
    facts = {
        "f_effectif_snapshot": build_fact_effectif(personnel),
        "f_demande_conge": build_fact_conge(dem_cng, justif, personnel),
        "f_pointage_retard": build_fact_pointage_retard(pointer, retard, personnel),
    }

    print("[TRANSFORM] Transformation terminée.")
    return {"dimensions": dims, "facts": facts}