import pandas as pd
from etl.config import get_source_engine

def run_extract() -> dict[str, pd.DataFrame]:
    engine = get_source_engine()

    personnel = pd.read_sql_query("""
        SELECT
            "COD_SOC", "MAT_PERS", "NOM_PERS", "PREN_PERS",
            "SEXE", "DAT_EMB", "DAT_NAIS",
            "COD_SERV", "COD_GOUV", "COD_GRAD", "ETAT_ACT"
        FROM public."PERSONNEL"
    """, engine)

    typ_conge = pd.read_sql_query("""
    SELECT
        "TYP_CNG", "LIB_CNG", "LIB_CNG_A",
        "MOIS_DEBUT", "MOIS_FIN", "RESERVE",
        "DROIT_CONGE", "NAT_TYP_CNG", "SOLD"
    FROM public."TYP_CONGE"
""", engine)

    gouvernorat = pd.read_sql_query("""
    SELECT
        "COD_GOUV", "LIB_GOUV", "LIB_GOUV_A"
    FROM public."GOUVERNORAT"
""", engine)
    
    service = pd.read_sql_query("""
    SELECT
        "COD_SERV", "SER_COD_SERV", "LIB_SERV", "ABR_SERV", "TYPE_SERV"
    FROM public."SERVICE"
""", engine)

    grade = pd.read_sql_query("""
    SELECT
        "ID_GRADE", "COD_GRAD", "LIB_GRAD", "COD_CAT"
    FROM public."GRADE"
""", engine)

    dem_cng = pd.read_sql_query("""
        SELECT
            "COD_SOC", "MAT_PERS", "NUM_DCNG",
            "DAT_DEBUT", "DAT_FIN",
            "CODE_M", "VALID", "ETAT_CNG", "NAT_CNG", "PLANIFIER", "CLOTURE", "SIGN_CNG",
            "NBR_JOURS", "NBR_HEURE", "NBR_JOURS_CAL"
        FROM public."DEM_CNG"
    """, engine)

    justif_dem_cng = pd.read_sql_query("""
        SELECT
            "COD_SOC", "MAT_PERS", "NUM_DCNG"
        FROM public."JUSTIF_DEM_CNG"
    """, engine)

    pointer = pd.read_sql_query("""
        SELECT
            "MAT_PERS", "DATE_POINT", "TYP_POINT", "DUREE_TOT"
        FROM public."POINTER"
    """, engine)

    retard_journee = pd.read_sql_query("""
        SELECT
            "MAT_PERS", "DAT_POINT", "DUREE_TOT"
        FROM public."RETARD_JOURNEE"
    """, engine)

    print("[EXTRACT] Extraction terminée.")

    return {
        "personnel": personnel,
        "dem_cng": dem_cng,
        "justif_dem_cng": justif_dem_cng,
        "pointer": pointer,
        "retard_journee": retard_journee,
        "gouvernorat": gouvernorat,
        "service": service,
        "grade": grade,
        "typ_conge": typ_conge
    }