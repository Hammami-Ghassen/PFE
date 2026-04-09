import pandas as pd
from sqlalchemy import text
from etl.config import get_dw_engine

DDL = [
    """
    CREATE TABLE IF NOT EXISTS d_temps (
        id_temps SERIAL PRIMARY KEY,
        date_complete DATE UNIQUE NOT NULL,
        jour SMALLINT, mois SMALLINT, trimestre SMALLINT, annee SMALLINT,
        semaine_annee SMALLINT, nom_jour VARCHAR(20), nom_mois VARCHAR(20),
        est_weekend BOOLEAN
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS d_service (
        id_service SERIAL PRIMARY KEY,
        code_service VARCHAR(50) UNIQUE NOT NULL,
        libelle_service VARCHAR(255)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS d_gouvernorat (
        id_gouvernorat SERIAL PRIMARY KEY,
        code_gouvernorat VARCHAR(50) UNIQUE NOT NULL,
        libelle_gouvernorat VARCHAR(255)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS d_grade (
        id_grade SERIAL PRIMARY KEY,
        code_grade VARCHAR(50) UNIQUE NOT NULL,
        libelle_grade VARCHAR(255)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS d_etat_act (
        id_etat_act SERIAL PRIMARY KEY,
        code_etat_act VARCHAR(50) UNIQUE NOT NULL,
        libelle_etat_act VARCHAR(255)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS d_sexe (
        id_sexe SERIAL PRIMARY KEY,
        code_sexe VARCHAR(10) UNIQUE NOT NULL,
        libelle_sexe VARCHAR(50)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS d_personnel (
        id_personnel SERIAL PRIMARY KEY,
        matricule VARCHAR(50) UNIQUE NOT NULL,
        nom VARCHAR(150),
        prenom VARCHAR(150),
        date_naissance DATE,
        date_recrutement DATE,
        code_service VARCHAR(50),
        code_gouvernorat VARCHAR(50),
        code_grade VARCHAR(50),
        code_etat_act VARCHAR(50),
        code_sexe VARCHAR(10)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS d_motif_conge (
        id_motif_conge SERIAL PRIMARY KEY,
        code_motif_conge VARCHAR(50) UNIQUE NOT NULL,
        libelle_motif_conge VARCHAR(255)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS d_statut_conge (
        id_statut_conge SERIAL PRIMARY KEY,
        valid_code VARCHAR(10),
        etat_cng_code VARCHAR(10),
        nat_cng_code VARCHAR(10),
        libelle_statut VARCHAR(255)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS d_type_pointage (
        id_type_pointage SERIAL PRIMARY KEY,
        code_type_pointage VARCHAR(10) UNIQUE NOT NULL,
        libelle_type_pointage VARCHAR(100)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS d_etat_retard (
        id_etat_retard SERIAL PRIMARY KEY,
        code_etat_retard VARCHAR(20) UNIQUE NOT NULL,
        libelle_etat_retard VARCHAR(100)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS f_effectif_snapshot (
        id_effectif_snapshot BIGSERIAL PRIMARY KEY,
        id_temps INT,
        id_personnel INT,
        id_service INT,
        id_gouvernorat INT,
        id_grade INT,
        id_etat_act INT,
        id_sexe INT,
        nb_agent INT,
        age INT,
        anciennete_jours INT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS f_demande_conge (
        id_demande_conge BIGSERIAL PRIMARY KEY,
        code_soc VARCHAR(50),
        num_demande_conge VARCHAR(50),
        id_temps_debut INT,
        id_temps_fin INT,
        id_personnel INT,
        id_service INT,
        id_motif_conge INT,
        id_statut_conge INT,
        nb_demande INT,
        nbr_jours NUMERIC(12,2),
        nbr_heures NUMERIC(12,2),
        nbr_jours_cal NUMERIC(12,2),
        est_justifie BOOLEAN,
        nb_justificatifs INT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS f_pointage_retard (
        id_pointage_retard BIGSERIAL PRIMARY KEY,
        id_temps INT,
        id_personnel INT,
        id_service INT,
        id_type_pointage INT,
        id_etat_retard INT,
        nb_pointage INT,
        nb_retard INT,
        est_retard BOOLEAN,
        ret_min NUMERIC(12,2),
        duree_tot NUMERIC(12,2)
    )
    """
]

DIM_ORDER = [
    "d_temps", "d_service", "d_gouvernorat", "d_grade", "d_etat_act",
    "d_sexe", "d_personnel", "d_motif_conge", "d_statut_conge",
    "d_type_pointage", "d_etat_retard"
]

def create_tables():
    engine = get_dw_engine()
    with engine.begin() as conn:
        for stmt in DDL:
            conn.execute(text(stmt))

def truncate_tables():
    engine = get_dw_engine()
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE f_pointage_retard, f_demande_conge, f_effectif_snapshot RESTART IDENTITY"))
        conn.execute(text("TRUNCATE TABLE d_etat_retard, d_type_pointage, d_statut_conge, d_motif_conge, d_personnel, d_sexe, d_etat_act, d_grade, d_gouvernorat, d_service, d_temps RESTART IDENTITY"))

def load_dimensions(dimensions: dict):
    engine = get_dw_engine()
    for name in DIM_ORDER:
        df = dimensions[name]
        df.to_sql(name, engine, if_exists="append", index=False, method="multi", chunksize=5000)
        print(f"[LOAD] {name} chargé : {len(df)} lignes")

def get_dim(table: str) -> pd.DataFrame:
    engine = get_dw_engine()
    return pd.read_sql_table(table, engine)

def load_fact_effectif(fact: pd.DataFrame):
    engine = get_dw_engine()
    fact = fact.copy()
    fact["snapshot_date"] = pd.to_datetime(fact["snapshot_date"]).dt.date

    d_temps = get_dim("d_temps")[["id_temps", "date_complete"]]
    d_personnel = get_dim("d_personnel")[["id_personnel", "matricule"]]
    d_service = get_dim("d_service")[["id_service", "code_service"]]
    d_gouvernorat = get_dim("d_gouvernorat")[["id_gouvernorat", "code_gouvernorat"]]
    d_grade = get_dim("d_grade")[["id_grade", "code_grade"]]
    d_etat_act = get_dim("d_etat_act")[["id_etat_act", "code_etat_act"]]
    d_sexe = get_dim("d_sexe")[["id_sexe", "code_sexe"]]

    fact = fact.merge(d_temps, left_on="snapshot_date", right_on="date_complete", how="left")
    fact = fact.merge(d_personnel, on="matricule", how="left")
    fact = fact.merge(d_service, on="code_service", how="left")
    fact = fact.merge(d_gouvernorat, on="code_gouvernorat", how="left")
    fact = fact.merge(d_grade, on="code_grade", how="left")
    fact = fact.merge(d_etat_act, on="code_etat_act", how="left")
    fact = fact.merge(d_sexe, on="code_sexe", how="left")

    fact = fact[[
        "id_temps", "id_personnel", "id_service", "id_gouvernorat",
        "id_grade", "id_etat_act", "id_sexe", "nb_agent", "age", "anciennete_jours"
    ]]
    fact.to_sql("f_effectif_snapshot", engine, if_exists="append", index=False, method="multi", chunksize=5000)
    print(f"[LOAD] f_effectif_snapshot chargé : {len(fact)} lignes")

def load_fact_conge(fact: pd.DataFrame):
    engine = get_dw_engine()
    fact = fact.copy()
    fact["date_debut"] = pd.to_datetime(fact["date_debut"], errors="coerce").dt.date
    fact["date_fin"] = pd.to_datetime(fact["date_fin"], errors="coerce").dt.date

    d_temps = get_dim("d_temps")[["id_temps", "date_complete"]]
    d_personnel = get_dim("d_personnel")[["id_personnel", "matricule"]]
    d_service = get_dim("d_service")[["id_service", "code_service"]]
    d_motif = get_dim("d_motif_conge")[["id_motif_conge", "code_motif_conge"]]
    d_statut = get_dim("d_statut_conge")[["id_statut_conge", "valid_code", "etat_cng_code", "nat_cng_code"]]

    fact = fact.merge(d_temps, left_on="date_debut", right_on="date_complete", how="left").rename(columns={"id_temps": "id_temps_debut"})
    fact = fact.merge(d_personnel, on="matricule", how="left")
    fact = fact.merge(d_service, on="code_service", how="left")
    fact = fact.merge(d_motif, on="code_motif_conge", how="left")
    fact = fact.merge(d_statut, on=["valid_code", "etat_cng_code", "nat_cng_code"], how="left")

    fact["id_temps_fin"] = pd.NA
    fact = fact[[
        "code_soc", "num_demande_conge", "id_temps_debut", "id_temps_fin", "id_personnel",
        "id_service", "id_motif_conge", "id_statut_conge", "nb_demande",
        "nbr_jours", "nbr_heures", "nbr_jours_cal", "est_justifie", "nb_justificatifs"
    ]]

    fact.to_sql("f_demande_conge", engine, if_exists="append", index=False, method="multi", chunksize=5000)
    print(f"[LOAD] f_demande_conge chargé : {len(fact)} lignes")

def load_fact_pointage(fact: pd.DataFrame):
    engine = get_dw_engine()
    fact = fact.copy()
    fact["date_point"] = pd.to_datetime(fact["date_point"], errors="coerce").dt.date

    d_temps = get_dim("d_temps")[["id_temps", "date_complete"]]
    d_personnel = get_dim("d_personnel")[["id_personnel", "matricule"]]
    d_service = get_dim("d_service")[["id_service", "code_service"]]
    d_type = get_dim("d_type_pointage")[["id_type_pointage", "code_type_pointage"]]
    d_retard = get_dim("d_etat_retard")[["id_etat_retard", "code_etat_retard"]]

    fact = fact.merge(d_temps, left_on="date_point", right_on="date_complete", how="left")
    fact = fact.merge(d_personnel, on="matricule", how="left")
    fact = fact.merge(d_service, on="code_service", how="left")
    fact = fact.merge(d_type, on="code_type_pointage", how="left")
    fact = fact.merge(d_retard, on="code_etat_retard", how="left")

    fact = fact[[
        "id_temps", "id_personnel", "id_service", "id_type_pointage", "id_etat_retard",
        "nb_pointage", "nb_retard", "est_retard", "ret_min", "duree_tot"
    ]]
    fact.to_sql("f_pointage_retard", engine, if_exists="append", index=False, method="multi", chunksize=5000)
    print(f"[LOAD] f_pointage_retard chargé : {len(fact)} lignes")

def run_load(transformed_data: dict):
    create_tables()
    truncate_tables()
    load_dimensions(transformed_data["dimensions"])
    load_fact_effectif(transformed_data["facts"]["f_effectif_snapshot"])
    load_fact_conge(transformed_data["facts"]["f_demande_conge"])
    load_fact_pointage(transformed_data["facts"]["f_pointage_retard"])
    print("[LOAD] Chargement terminé.")