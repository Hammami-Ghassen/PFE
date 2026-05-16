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

def make_service_source_key(code_soc: pd.Series, code_service: pd.Series) -> pd.Series:
    return (
        code_soc.astype("string").str.strip().fillna("")
        + "_"
        + code_service.astype("string").str.strip().fillna("")
    )

def build_dimensions(personnel, dem_cng, pointer, gouvernorat, service, grade, typ_conge, etat_paie, motif_j, societe):
    d_service = service.copy()
    d_service["COD_SOC"] = clean_text(d_service["COD_SOC"])
    d_service["COD_SERV"] = clean_text(d_service["COD_SERV"])
    d_service["LIB_SERV"] = clean_text(d_service["LIB_SERV"])
    d_service["TYPE_SERV"] = clean_text(d_service["TYPE_SERV"])
    d_service["SER_COD_SERV"] = clean_text(d_service["SER_COD_SERV"])

    d_service["cle_service_source"] = make_service_source_key(
        d_service["COD_SOC"],
        d_service["COD_SERV"]
    )

    d_service = (
        d_service[["cle_service_source", "COD_SERV", "SER_COD_SERV", "LIB_SERV", "TYPE_SERV"]]
        .dropna(subset=["cle_service_source", "COD_SERV"])
        .drop_duplicates(subset=["cle_service_source"])
        .rename(columns={
            "COD_SERV": "code_service",
            "SER_COD_SERV": "code_service_parent",
            "LIB_SERV": "libelle_service",
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
    d_grade["COD_GRAD"] = clean_text(d_grade["COD_GRAD"])
    d_grade["LIB_GRAD"] = clean_text(d_grade["LIB_GRAD"])
    d_grade["COD_CAT"] = clean_text(d_grade["COD_CAT"])
    d_grade["COD_CATEG"] = clean_text(d_grade["COD_CATEG"])

    d_grade = (
    d_grade[["COD_CATEG", "COD_GRAD", "LIB_GRAD", "COD_CAT"]]
    .dropna(subset=["COD_GRAD"])
    .drop_duplicates(subset=["COD_CATEG", "COD_CAT", "COD_GRAD"])
    .rename(columns={
        "COD_CATEG": "code_categ",
        "COD_GRAD": "code_grade",
        "LIB_GRAD": "libelle_grade",
        "COD_CAT": "code_cat",
    })
)

    d_societe = societe.copy()
    d_societe["COD_SOC"] = clean_text(d_societe["COD_SOC"])
    d_societe["LIB_SOC"] = clean_text(d_societe["LIB_SOC"])

    d_societe = (
    d_societe[["COD_SOC", "LIB_SOC"]]
    .dropna(subset=["COD_SOC"])
    .drop_duplicates(subset=["COD_SOC"])
    .rename(columns={
        "COD_SOC": "code_societe",
        "LIB_SOC": "libelle_societe",
    })
)




    d_etat_act = etat_paie.copy()
    d_etat_act["COD_ETAT"] = clean_text(d_etat_act["COD_ETAT"])
    d_etat_act["LIB_ETAT"] = clean_text(d_etat_act["LIB_ETAT"])

    d_etat_act = (
    d_etat_act[["COD_ETAT", "LIB_ETAT"]]
    .dropna(subset=["COD_ETAT"])
    .drop_duplicates(subset=["COD_ETAT"])
    .rename(columns={
        "COD_ETAT": "code_etat_act",
        "LIB_ETAT": "libelle_etat_act",
    })
)


    d_personnel = personnel.copy()
    for col in ["MAT_PERS", "NOM_PERS", "PREN_PERS"]:
        d_personnel[col] = clean_text(d_personnel[col])
    d_personnel["SEXE"] = d_personnel["SEXE"].str.upper()

    d_personnel = (
        d_personnel[[
            "MAT_PERS", "NOM_PERS", "PREN_PERS", "DAT_NAIS", "DAT_EMB"
        ]]
        .dropna(subset=["MAT_PERS"])
        .drop_duplicates(subset=["MAT_PERS"])
        .rename(columns={
            "MAT_PERS": "matricule",
            "NOM_PERS": "nom",
            "PREN_PERS": "prenom",
            "DAT_NAIS": "date_naissance",
            "DAT_EMB": "date_recrutement",
        })
    )

    d_motif_conge = motif_j.copy()

    d_motif_conge["COD_M"] = clean_text(d_motif_conge["COD_M"])
    d_motif_conge["TYP_CNG"] = clean_text(d_motif_conge["TYP_CNG"])
    d_motif_conge["LIB_MOT"] = clean_text(d_motif_conge["LIB_MOT"])

    typ_conge_ref = typ_conge.copy()
    typ_conge_ref["TYP_CNG"] = clean_text(typ_conge_ref["TYP_CNG"])
    typ_conge_ref["LIB_CNG"] = clean_text(typ_conge_ref["LIB_CNG"])

    d_motif_conge = d_motif_conge.merge(
    typ_conge_ref[["TYP_CNG", "LIB_CNG"]],
    on="TYP_CNG",
    how="left"
)

    d_motif_conge = (
    d_motif_conge[["COD_M", "TYP_CNG", "LIB_MOT", "LIB_CNG"]]
    .dropna(subset=["COD_M"])
    .drop_duplicates(subset=["COD_M"])
    .rename(columns={
        "COD_M": "code_motif_conge",
        "TYP_CNG": "code_type_conge",
        "LIB_MOT": "libelle_motif_conge",
        "LIB_CNG": "libelle_type_conge",
    })
)

    d_statut_demande_conge = dem_cng[["VALID"]].copy()
    d_statut_demande_conge["VALID"] = clean_text(d_statut_demande_conge["VALID"])

    d_statut_demande_conge = d_statut_demande_conge.drop_duplicates().rename(columns={
    "VALID": "valid_code",
})

    def map_statut_demande(valid_code):
        if valid_code == "O":
            return "Demande acceptée"
        if valid_code == "N":
            return "Demande refusée"
        if valid_code == "I":
            return "Demande en cours"
        return f"Statut {valid_code}" if pd.notna(valid_code) else "Statut inconnu"

    d_statut_demande_conge["libelle_statut_demande"] = d_statut_demande_conge["valid_code"].apply(map_statut_demande)
   

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

    d_etat_retard = pd.DataFrame([
    {
        "id_etat_retard": 0,
        "code_etat_retard": "NON_RETARD",
        "libelle_etat_retard": "Pas de retard"
    },
    {
        "id_etat_retard": 1,
        "code_etat_retard": "RETARD",
        "libelle_etat_retard": "Retard constaté"
    }
])

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
        "d_personnel": d_personnel,
        "d_motif_conge": d_motif_conge,
        "d_statut_demande_conge": d_statut_demande_conge,
        "d_type_pointage": d_type_pointage,
        "d_etat_retard": d_etat_retard,
        "d_societe": d_societe,

    }

def build_fact_effectif(personnel, societe, d_temps):
    df = personnel.copy()

    for col in ["MAT_PERS", "COD_SOC", "COD_SERV", "COD_CATEG", "COD_CAT", "COD_GRAD", "ETAT_ACT", "SEXE"]:
        df[col] = clean_text(df[col])

    soc = societe.copy()
    soc["COD_SOC"] = clean_text(soc["COD_SOC"])
    soc["COD_GOUV"] = clean_text(soc["COD_GOUV"])
    soc = soc.rename(columns={"COD_GOUV": "COD_GOUV_TRAVAIL"})

    df = df.merge(
        soc[["COD_SOC", "COD_GOUV_TRAVAIL"]],
        on="COD_SOC",
        how="left"
    )

    df["DAT_NAIS"] = pd.to_datetime(df["DAT_NAIS"], errors="coerce")
    df["DAT_EMB"] = pd.to_datetime(df["DAT_EMB"], errors="coerce")

    # dates de la dimension temps
    temps = d_temps.copy()
    temps["date_complete"] = pd.to_datetime(temps["date_complete"], errors="coerce")

    # fins de trimestre
    quarter_end_dates = temps[
        temps["date_complete"].dt.month.isin([3, 6, 9, 12])
    ].copy()

    quarter_end_dates = quarter_end_dates[
        (
            ((quarter_end_dates["date_complete"].dt.month == 3) & (quarter_end_dates["date_complete"].dt.day == 31)) |
            ((quarter_end_dates["date_complete"].dt.month == 6) & (quarter_end_dates["date_complete"].dt.day == 30)) |
            ((quarter_end_dates["date_complete"].dt.month == 9) & (quarter_end_dates["date_complete"].dt.day == 30)) |
            ((quarter_end_dates["date_complete"].dt.month == 12) & (quarter_end_dates["date_complete"].dt.day == 31))
        )
    ]

    snapshot_dates = sorted(quarter_end_dates["date_complete"].dropna().unique())

    # ajouter la dernière date disponible si elle n'est pas déjà incluse
    last_available_date = temps["date_complete"].max()
    if pd.notna(last_available_date) and last_available_date not in snapshot_dates:
        snapshot_dates.append(last_available_date)

    snapshots = []

    for snapshot in snapshot_dates:
        df_snapshot = df[df["DAT_EMB"].isna() | (df["DAT_EMB"] <= snapshot)].copy()
        fact_snapshot = pd.DataFrame({
            "snapshot_date": snapshot,
            "matricule": df_snapshot["MAT_PERS"],
            "code_soc": df_snapshot["COD_SOC"],
            "code_service": df_snapshot["COD_SERV"],
            "cle_service_source": make_service_source_key(
                df_snapshot["COD_SOC"],
                df_snapshot["COD_SERV"]
            ),
            "code_gouvernorat": df_snapshot["COD_GOUV_TRAVAIL"],
            "code_categ": df_snapshot["COD_CATEG"],
            "code_cat": df_snapshot["COD_CAT"],
            "code_grade": df_snapshot["COD_GRAD"],
            "code_etat_act": df_snapshot["ETAT_ACT"],
            "code_sexe": df_snapshot["SEXE"],
            "nb_agent": 1,
            "age": ((snapshot - df_snapshot["DAT_NAIS"]).dt.days / 365.25).round().astype("Int64"),
            "anciennete_jours": (snapshot - df_snapshot["DAT_EMB"]).dt.days.astype("Int64"),
    })

        snapshots.append(fact_snapshot)

    fact = pd.concat(snapshots, ignore_index=True)

    return fact.dropna(subset=["matricule"]).drop_duplicates(
        subset=["snapshot_date", "matricule"]
    )

def build_fact_conge(dem_cng, justif, personnel):
    dem = dem_cng.copy()

    for col in ["COD_SOC", "MAT_PERS", "CODE_M", "VALID"]:
        dem[col] = clean_text(dem[col])

    dem["NUM_DCNG"] = dem["NUM_DCNG"].astype("string").str.strip()
    dem["DAT_DEBUT"] = pd.to_datetime(dem["DAT_DEBUT"], errors="coerce")
    dem["DAT_FIN"] = pd.to_datetime(dem["DAT_FIN"], errors="coerce")
    dem["NBR_JOURS"] = pd.to_numeric(dem["NBR_JOURS"], errors="coerce")

    dem = dem.drop_duplicates(subset=["COD_SOC", "MAT_PERS", "NUM_DCNG"])

    j = justif.copy()
    for col in ["COD_SOC", "MAT_PERS"]:
        j[col] = clean_text(j[col])

    j["NUM_DCNG"] = j["NUM_DCNG"].astype("string").str.strip()

    j = (
        j.groupby(["COD_SOC", "MAT_PERS", "NUM_DCNG"], dropna=False)
        .size()
        .reset_index(name="nb_justificatifs")
    )

    # récupérer le service depuis personnel avec la société
    pers = personnel.copy()
    pers["COD_SOC"] = clean_text(pers["COD_SOC"])
    pers["MAT_PERS"] = clean_text(pers["MAT_PERS"])
    pers["COD_SERV"] = clean_text(pers["COD_SERV"])

    pers = (
        pers[["COD_SOC", "MAT_PERS", "COD_SERV"]]
        .drop_duplicates(subset=["COD_SOC", "MAT_PERS"])
    )

    fact = dem.merge(j, how="left", on=["COD_SOC", "MAT_PERS", "NUM_DCNG"])
    fact = fact.merge(pers, how="left", on=["COD_SOC", "MAT_PERS"])

    fact["cle_service_source"] = make_service_source_key(
        fact["COD_SOC"],
        fact["COD_SERV"]
    )

    fact["nb_justificatifs"] = fact["nb_justificatifs"].fillna(0).astype(int)
    fact["est_justifie"] = fact["nb_justificatifs"] > 0

    fact = fact.rename(columns={
        "COD_SOC": "code_soc",
        "DAT_DEBUT": "date_debut",
        "DAT_FIN": "date_fin",
        "MAT_PERS": "matricule",
        "COD_SERV": "code_service",
        "CODE_M": "code_motif_conge",
        "VALID": "valid_code",
        "NBR_JOURS": "nbr_jours",
    })

    fact["nb_demande"] = 1
    fact["nbr_jours"] = pd.to_numeric(fact["nbr_jours"], errors="coerce")

    fact = fact[[
        "date_debut",
        "date_fin",
        "code_soc",
        "matricule",
        "code_service",
        "cle_service_source",
        "code_motif_conge",
        "valid_code",
        "nb_demande",
        "nbr_jours",
        "est_justifie",
        "nb_justificatifs",
    ]]

    fact = fact.drop_duplicates(
        subset=["code_soc", "matricule", "date_debut", "date_fin", "code_motif_conge"]
    )

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
    pers["COD_SOC"] = clean_text(pers["COD_SOC"])
    pers["COD_SERV"] = clean_text(pers["COD_SERV"])
    pers = pers[["MAT_PERS", "COD_SOC","COD_SERV"]].drop_duplicates(subset=["MAT_PERS"])

    fact = pt.merge(rt, how="left", left_on=["MAT_PERS", "DATE_POINT"], right_on=["MAT_PERS", "DAT_POINT"])
    fact = fact.merge(pers, how="left", on="MAT_PERS")
    fact["cle_service_source"] = make_service_source_key(
        fact["COD_SOC"],
        fact["COD_SERV"]
    )

    
    fact["ret_min"] = pd.to_numeric(fact["ret_min"], errors="coerce").fillna(0.0)
    fact["duree_tot"] = pd.to_numeric(fact["duree_tot"], errors="coerce").fillna(0.0)
    fact["code_etat_retard"] = np.where(fact["ret_min"] > 0, "RETARD", "NON_RETARD")

    fact = fact.rename(columns={
        "DATE_POINT": "date_point",
        "MAT_PERS": "matricule",
        "COD_SERV": "code_service",
        "TYP_POINT": "code_type_pointage", 
        "COD_SOC": "code_soc",
    })

    fact = fact[[
        "date_point", "matricule", "code_soc", "code_service", "cle_service_source", "code_type_pointage",
        "code_etat_retard", "nb_pointage", "ret_min", "duree_tot"
    ]]

    return fact.drop_duplicates(subset=["date_point", "matricule", "code_type_pointage"])


def build_user_societe_access(personnel, adr_pers):
    pers = personnel.copy()
    adr = adr_pers.copy()

    for col in ["COD_USER", "COD_SOC", "MAT_PERS"]:
        pers[col] = clean_text(pers[col])

    adr["MAT_PERS"] = clean_text(adr["MAT_PERS"])
    adr["ADR_ELECTRONIQUE"] = clean_text(adr["ADR_ELECTRONIQUE"])

    # garder seulement les directeurs
    pers = pers[pers["COD_USER"] == "DIRECTEUR"].copy()

    # jointure par MAT_PERS
    src = pers.merge(
        adr[["MAT_PERS", "ADR_ELECTRONIQUE"]].drop_duplicates(subset=["MAT_PERS"]),
        on="MAT_PERS",
        how="left"
    )

    src = src.rename(columns={
        "COD_USER": "cod_user",
        "COD_SOC": "cod_soc",
        "ADR_ELECTRONIQUE": "adr_electronique",
    })

    src["access_all"] = src["cod_soc"].eq("0001")
    src["actif"] = True

    access = (
        src[["cod_user", "adr_electronique", "cod_soc", "access_all", "actif"]]
        .dropna(subset=["cod_user", "adr_electronique", "cod_soc"])
        .drop_duplicates(subset=["adr_electronique", "cod_soc"])
    )

    return access

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
    etat_paie = extracted_data["etat_paie"]
    motif_j = extracted_data["motif_j"]
    societe = extracted_data["societe"]
    adr_pers = extracted_data["adr_pers"]

    dims = build_dimensions(
        personnel, dem_cng, pointer,
        gouvernorat, service, grade,
        typ_conge, etat_paie, motif_j, societe
    )

    facts = {
        "f_effectif_snapshot": build_fact_effectif(personnel, societe, dims["d_temps"]),
        "f_demande_conge": build_fact_conge(dem_cng, justif, personnel),
        "f_pointage_retard": build_fact_pointage_retard(pointer, retard, personnel),
    }
    security = {
    "user_societe_access": build_user_societe_access(personnel, adr_pers)
}

    print("[TRANSFORM] Transformation terminée.")
    return {"dimensions": dims, "facts": facts, "security": security}