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

def build_dimensions(personnel, dem_cng, pointer, gouvernorat, service, grade, typ_conge):
    d_service = service.copy()
    d_service["COD_SERV"] = clean_text(d_service["COD_SERV"])
    d_service["LIB_SERV"] = clean_text(d_service["LIB_SERV"])
    d_service["ABR_SERV"] = clean_text(d_service["ABR_SERV"])
    d_service["TYPE_SERV"] = clean_text(d_service["TYPE_SERV"])
    d_service["SER_COD_SERV"] = clean_text(d_service["SER_COD_SERV"])

    d_service = (
        d_service[["COD_SERV", "SER_COD_SERV", "LIB_SERV", "ABR_SERV", "TYPE_SERV"]]
        .dropna(subset=["COD_SERV"])
        .drop_duplicates(subset=["COD_SERV"])
        .rename(columns={
        "COD_SERV": "code_service",
        "SER_COD_SERV": "code_service_parent",
        "LIB_SERV": "libelle_service",
        "ABR_SERV": "abreviation_service",
        "TYPE_SERV": "type_service",
    })
)

    d_gouvernorat = gouvernorat.copy()
    d_gouvernorat["COD_GOUV"] = clean_text(d_gouvernorat["COD_GOUV"])
    d_gouvernorat["LIB_GOUV"] = clean_text(d_gouvernorat["LIB_GOUV"])
    d_gouvernorat["LIB_GOUV_A"] = clean_text(d_gouvernorat["LIB_GOUV_A"])

    d_gouvernorat = (
       d_gouvernorat[["COD_GOUV", "LIB_GOUV"]]
       .dropna(subset=["COD_GOUV"])
       .drop_duplicates(subset=["COD_GOUV"])
       .rename(columns={
        "COD_GOUV": "code_gouvernorat",
        "LIB_GOUV": "libelle_gouvernorat",
    })
)

    d_grade = grade.copy()
    d_grade["ID_GRADE"] = pd.to_numeric(d_grade["ID_GRADE"], errors="coerce")
    d_grade["COD_GRAD"] = clean_text(d_grade["COD_GRAD"])
    d_grade["LIB_GRAD"] = clean_text(d_grade["LIB_GRAD"])
    d_grade["COD_CAT"] = clean_text(d_grade["COD_CAT"])

    d_grade = (
    d_grade[["ID_GRADE", "COD_GRAD", "LIB_GRAD", "COD_CAT"]]
    .dropna(subset=["COD_GRAD"])
    .drop_duplicates(subset=["COD_GRAD"])
    .rename(columns={
        "ID_GRADE": "id_grade_source",
        "COD_GRAD": "code_grade",
        "LIB_GRAD": "libelle_grade",
        "COD_CAT": "code_categorie",
    })
)

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

    d_statut_demande_conge = dem_cng[
    ["VALID", "ETAT_CNG", "PLANIFIER", "CLOTURE", "SIGN_CNG"]
    ].copy()

    for col in ["VALID", "ETAT_CNG", "PLANIFIER", "CLOTURE", "SIGN_CNG"]:
        d_statut_demande_conge[col] = clean_text(d_statut_demande_conge[col])

    d_statut_demande_conge = d_statut_demande_conge.drop_duplicates().rename(columns={
        "VALID": "valid_code",
        "ETAT_CNG": "etat_cng_code",
        "PLANIFIER": "planifier_code",
        "CLOTURE": "cloture_code",
        "SIGN_CNG": "sign_cng_code",
    })

    def map_statut_demande(row):
        v = row["valid_code"]
        e = row["etat_cng_code"]
        p = row["planifier_code"]
        c = row["cloture_code"]
        s = row["sign_cng_code"]

        if v == "N" and e == "R":
           return "Demande refusée"
        if v == "O" and e == "C" and c == "O":
           return "Demande acceptée et clôturée"
        if v == "I" and e == "E" and c == "N":
           return "Demande en cours"
        return (
        f"VALID={v if pd.notna(v) else 'NULL'} | "
        f"ETAT={e if pd.notna(e) else 'NULL'} | "
        f"PLANIFIER={p if pd.notna(p) else 'NULL'} | "
        f"CLOTURE={c if pd.notna(c) else 'NULL'} | "
        f"SIGN={s if pd.notna(s) else 'NULL'}"
    )

    d_statut_demande_conge["libelle_statut_demande"] = d_statut_demande_conge.apply(
    map_statut_demande, axis=1
)

    d_type_conge = typ_conge.copy()

    for col in [
    "TYP_CNG", "LIB_CNG", "LIB_CNG_A", "MOIS_DEBUT", "MOIS_FIN",
    "RESERVE", "DROIT_CONGE", "NAT_TYP_CNG", "SOLD"
]:
     d_type_conge[col] = clean_text(d_type_conge[col])

    d_type_conge = (
    d_type_conge[[
        "TYP_CNG", "LIB_CNG", "LIB_CNG_A", "MOIS_DEBUT", "MOIS_FIN",
        "RESERVE", "DROIT_CONGE", "NAT_TYP_CNG", "SOLD"
    ]]
    .dropna(subset=["TYP_CNG"])
    .drop_duplicates(subset=["TYP_CNG"])
    .rename(columns={
        "TYP_CNG": "code_type_conge",
        "LIB_CNG": "libelle_type_conge_fr",
        "LIB_CNG_A": "libelle_type_conge_ar",
        "MOIS_DEBUT": "mois_debut",
        "MOIS_FIN": "mois_fin",
        "RESERVE": "reserve_code",
        "DROIT_CONGE": "droit_conge_code",
        "NAT_TYP_CNG": "nature_type_conge",
        "SOLD": "gestion_solde_code",
    })
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
        "d_statut_demande_conge": d_statut_demande_conge,
        "d_type_conge": d_type_conge,
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
    for col in ["COD_SOC", "MAT_PERS", "NUM_DCNG", "CODE_M", "VALID", "ETAT_CNG", "NAT_CNG", "PLANIFIER", "CLOTURE", "SIGN_CNG"]:
        dem[col] = clean_text(dem[col])

    dem["DAT_DEBUT"] = pd.to_datetime(dem["DAT_DEBUT"], errors="coerce")
    dem["DAT_FIN"] = pd.to_datetime(dem["DAT_FIN"], errors="coerce")

    dem["NBR_JOURS"] = pd.to_numeric(dem["NBR_JOURS"], errors="coerce")
    dem["NBR_HEURE"] = pd.to_numeric(dem["NBR_HEURE"], errors="coerce")
    dem["NBR_JOURS_CAL"] = pd.to_numeric(dem["NBR_JOURS_CAL"], errors="coerce")

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
        "NAT_CNG": "code_type_conge",
        "PLANIFIER": "planifier_code",
        "CLOTURE": "cloture_code",
        "SIGN_CNG": "sign_cng_code",
        "NBR_JOURS": "nbr_jours",
        "NBR_HEURE": "nbr_heures",
        "NBR_JOURS_CAL": "nbr_jours_cal",
    })

    fact["nb_demande"] = 1

    fact["nbr_jours"] = pd.to_numeric(fact["nbr_jours"], errors="coerce")
    fact["nbr_heures"] = pd.to_numeric(fact["nbr_heures"], errors="coerce")
    fact["nbr_jours_cal"] = pd.to_numeric(fact["nbr_jours_cal"], errors="coerce")

    fact = fact[[
        "code_soc", "num_demande_conge", "date_debut", "date_fin",
        "matricule", "code_service",
        "code_motif_conge", "valid_code", "etat_cng_code", "planifier_code", "cloture_code", "sign_cng_code", "code_type_conge",
        "nb_demande", "nbr_jours", "nbr_heures", "nbr_jours_cal",
        "est_justifie", "nb_justificatifs"
    ]]

    fact = fact.drop_duplicates(subset=["code_soc", "num_demande_conge", "matricule"])
    return fact

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
    fact["ret_min"] = pd.to_numeric(fact["ret_min"], errors="coerce").fillna(0.0)
    fact["duree_tot"] = pd.to_numeric(fact["duree_tot"], errors="coerce").fillna(0.0)
    fact["est_retard"] = fact["nb_retard"] > 0
    fact["code_etat_retard"] = np.where(fact["est_retard"], "RETARD", pd.NA)

    fact = fact.rename(columns={
        "DATE_POINT": "date_point",
        "MAT_PERS": "matricule",
        "COD_SERV": "code_service",
        "TYP_POINT": "code_type_pointage",
    })

    fact = fact[[
        "date_point", "matricule", "code_service", "code_type_pointage",
        "code_etat_retard", "nb_pointage", "nb_retard", "est_retard", "ret_min", "duree_tot"
    ]]

    return fact.drop_duplicates(subset=["date_point", "matricule", "code_type_pointage"])

def run_transform(extracted_data: dict) -> dict:
    personnel = extracted_data["personnel"]
    dem_cng = extracted_data["dem_cng"]
    justif = extracted_data["justif_dem_cng"]
    pointer = extracted_data["pointer"]
    retard = extracted_data["retard_journee"]
    gouvernorat = extracted_data["gouvernorat"]
    service = extracted_data["service"]
    grade = extracted_data["grade"]
    typ_conge = extracted_data["typ_conge"]
    

    dims = build_dimensions(personnel, dem_cng, pointer, gouvernorat, service, grade, typ_conge)
    facts = {
        "f_effectif_snapshot": build_fact_effectif(personnel),
        "f_demande_conge": build_fact_conge(dem_cng, justif, personnel),
        "f_pointage_retard": build_fact_pointage_retard(pointer, retard, personnel),
    }

    print("[TRANSFORM] Transformation terminée.")
    return {"dimensions": dims, "facts": facts}