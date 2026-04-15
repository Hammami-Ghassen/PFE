import pandas as pd
from sqlalchemy import text
from sqlalchemy.types import Integer, Numeric, String, Boolean, Date
from etl.config import get_dw_engine


DIM_ORDER = [
    "d_temps", "d_societe", "d_service", "d_gouvernorat", "d_grade", "d_etat_act",
    "d_sexe", "d_personnel", "d_motif_conge", "d_statut_demande_conge",
    "d_type_pointage", "d_etat_retard"
]


def truncate_tables():
    engine = get_dw_engine()
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE f_pointage_retard, f_demande_conge, f_effectif_snapshot RESTART IDENTITY"))
        conn.execute(text("TRUNCATE TABLE d_etat_retard, d_type_pointage, d_statut_demande_conge, d_motif_conge, d_societe, d_personnel, d_sexe, d_etat_act, d_grade, d_gouvernorat, d_service, d_temps RESTART IDENTITY"))

def load_dimensions(dimensions: dict):
    engine = get_dw_engine()
    for name in DIM_ORDER:
        df = dimensions[name].copy()
        df.to_sql(name, engine, if_exists="append", index=False, method="multi", chunksize=5000)
        print(f"[LOAD] {name} chargé : {len(df)} lignes")

def get_dim(table: str) -> pd.DataFrame:
    engine = get_dw_engine()
    return pd.read_sql_table(table, engine)

def load_fact_effectif(fact: pd.DataFrame):
    engine = get_dw_engine()
    fact = fact.copy()

    fact["snapshot_date"] = pd.to_datetime(fact["snapshot_date"], errors="coerce").dt.normalize()

    d_temps = get_dim("d_temps")[["id_temps", "date_complete"]]
    d_temps["date_complete"] = pd.to_datetime(d_temps["date_complete"], errors="coerce").dt.normalize()

    d_societe = get_dim("d_societe")[["id_societe", "code_societe"]]
    d_personnel = get_dim("d_personnel")[["id_personnel", "matricule"]]
    d_service = get_dim("d_service")[["id_service", "code_service"]]
    d_gouvernorat = get_dim("d_gouvernorat")[["id_gouvernorat", "code_gouvernorat"]]
    d_grade = get_dim("d_grade")[["id_grade", "code_categ", "code_cat", "code_grade"]]
    d_etat_act = get_dim("d_etat_act")[["id_etat_act", "code_etat_act"]]
    d_sexe = get_dim("d_sexe")[["id_sexe", "code_sexe"]]

    fact = fact.merge(d_societe, left_on="code_soc", right_on="code_societe", how="left")
    fact = fact.merge(d_temps, left_on="snapshot_date", right_on="date_complete", how="left")
    fact = fact.merge(d_personnel, on="matricule", how="left")
    fact = fact.merge(d_service, on="code_service", how="left")
    fact = fact.merge(d_gouvernorat, on="code_gouvernorat", how="left")
    fact = fact.merge(d_grade, on=["code_categ", "code_cat", "code_grade"], how="left")
    fact = fact.merge(d_etat_act, on="code_etat_act", how="left")
    fact = fact.merge(d_sexe, on="code_sexe", how="left")

    for col in ["id_temps", "id_personnel", "id_service", "id_gouvernorat", "id_grade", "id_etat_act", "id_sexe", "nb_agent", "age", "anciennete_jours"]:
        fact[col] = pd.to_numeric(fact[col], errors="coerce").astype("Int64")

    fact = fact[[
        "id_temps", "id_personnel", "id_societe", "id_service", "id_gouvernorat",
        "id_grade", "id_etat_act", "id_sexe", "nb_agent", "age", "anciennete_jours"
    ]]

    fact.to_sql(
        "f_effectif_snapshot",
        engine,
        if_exists="append",
        index=False,
        chunksize=1000,
        dtype={
            "id_temps": Integer(),
            "id_personnel": Integer(),
            "id_societe": Integer(),
            "id_service": Integer(),
            "id_gouvernorat": Integer(),
            "id_grade": Integer(),
            "id_etat_act": Integer(),
            "id_sexe": Integer(),
            "nb_agent": Integer(),
            "age": Integer(),
            "anciennete_jours": Integer(),
        },
    )
    print(f"[LOAD] f_effectif_snapshot chargé : {len(fact)} lignes")

def load_fact_conge(fact: pd.DataFrame):
    engine = get_dw_engine()
    fact = fact.copy()

    fact["code_soc"] = fact["code_soc"].astype("string").str.strip()
    fact["date_debut"] = pd.to_datetime(fact["date_debut"], errors="coerce").dt.normalize()
    fact["date_fin"] = pd.to_datetime(fact["date_fin"], errors="coerce").dt.normalize()
    fact["code_service"] = fact["code_service"].astype("string").str.strip()
    fact["code_motif_conge"] = fact["code_motif_conge"].astype("string").str.strip()
    fact["valid_code"] = fact["valid_code"].astype("string").str.strip()
    fact["matricule"] = fact["matricule"].astype("string").str.strip()


    d_temps = get_dim("d_temps")[["id_temps", "date_complete"]].copy()
    d_temps["date_complete"] = pd.to_datetime(d_temps["date_complete"], errors="coerce").dt.normalize()
    d_societe = get_dim("d_societe")[["id_societe", "code_societe"]].copy()
    d_societe["code_societe"] = d_societe["code_societe"].astype("string").str.strip()
    d_personnel = get_dim("d_personnel")[["id_personnel", "matricule"]].copy()
    d_personnel["matricule"] = d_personnel["matricule"].astype("string").str.strip()
    d_service = get_dim("d_service")[["id_service", "code_service"]].copy()
    d_service["code_service"] = d_service["code_service"].astype("string").str.strip()
    d_motif = get_dim("d_motif_conge")[["id_motif_conge", "code_motif_conge"]].copy()
    d_motif["code_motif_conge"] = d_motif["code_motif_conge"].astype("string").str.strip()
    d_statut = get_dim("d_statut_demande_conge")[[
    "id_statut_demande_conge",
    "valid_code"
]].copy()
    d_statut["valid_code"] = d_statut["valid_code"].astype("string").str.strip()


    d_temps_debut = d_temps.rename(columns={"id_temps": "id_temps_debut", "date_complete": "date_debut"})
    d_temps_fin = d_temps.rename(columns={"id_temps": "id_temps_fin", "date_complete": "date_fin"})

    fact = fact.merge(d_temps_debut, on="date_debut", how="left")
    fact = fact.merge(d_temps_fin, on="date_fin", how="left")
    fact = fact.merge(d_personnel, on="matricule", how="left")
    fact = fact.merge(d_service, on="code_service", how="left")
    fact = fact.merge(d_motif, on="code_motif_conge", how="left")
    fact = fact.merge(d_statut, on=["valid_code"], how="left")
    fact = fact.merge(d_societe, left_on="code_soc", right_on="code_societe", how="left")

    fact = fact.drop_duplicates(subset=["code_soc", "id_personnel", "id_temps_debut", "id_temps_fin", "id_motif_conge"])

    for col in [
        "id_temps_debut", "id_temps_fin", "id_personnel", "id_service", "id_societe",
        "id_motif_conge", "id_statut_demande_conge", "nb_demande", "nb_justificatifs"
    ]:
        fact[col] = pd.to_numeric(fact[col], errors="coerce").astype("Int64")

    for col in ["nbr_jours"]:
        fact[col] = pd.to_numeric(fact[col], errors="coerce")

    fact["est_justifie"] = fact["est_justifie"].fillna(False).astype(bool)

    fact = fact[[
        "id_temps_debut", "id_temps_fin", "id_personnel",
        "id_societe", "id_service", "id_motif_conge", "id_statut_demande_conge", "nb_demande",
        "nbr_jours", "est_justifie", "nb_justificatifs"
    ]]

    fact.to_sql(
        "f_demande_conge",
        engine,
        if_exists="append",
        index=False,
        chunksize=1000,
        dtype={
            "id_temps_debut": Integer(),
            "id_temps_fin": Integer(),
            "id_societe": Integer(),
            "id_personnel": Integer(),
            "id_service": Integer(),
            "id_motif_conge": Integer(),
            "id_statut_demande_conge": Integer(),
            "nb_demande": Integer(),
            "nbr_jours": Numeric(12, 2),
            "est_justifie": Boolean(),
            "nb_justificatifs": Integer(),
        },
    )
    print(f"[LOAD] f_demande_conge chargé : {len(fact)} lignes")

def load_fact_pointage(fact: pd.DataFrame):
    engine = get_dw_engine()

    # -----------------------------
    # Charger les dimensions une seule fois
    # -----------------------------
    d_temps = get_dim("d_temps")[["id_temps", "date_complete"]].copy()
    d_temps["date_complete"] = pd.to_datetime(d_temps["date_complete"], errors="coerce").dt.normalize()

    d_personnel = get_dim("d_personnel")[["id_personnel", "matricule"]].copy()
    d_personnel["matricule"] = d_personnel["matricule"].astype("string").str.strip()
    d_societe = get_dim("d_societe")[["id_societe", "code_societe"]].copy()
    d_societe["code_societe"] = d_societe["code_societe"].astype("string").str.strip()

    d_service = get_dim("d_service")[["id_service", "code_service"]].copy()
    d_service["code_service"] = d_service["code_service"].astype("string").str.strip()

    d_type = get_dim("d_type_pointage")[["id_type_pointage", "code_type_pointage"]].copy()
    d_type["code_type_pointage"] = d_type["code_type_pointage"].astype("string").str.strip()

    d_retard = get_dim("d_etat_retard")[["id_etat_retard", "code_etat_retard"]].copy()
    d_retard["code_etat_retard"] = d_retard["code_etat_retard"].astype("string").str.strip()

    # -----------------------------
    # Mappings légers
    # -----------------------------
    map_temps = d_temps.drop_duplicates("date_complete").set_index("date_complete")["id_temps"]
    map_personnel = d_personnel.drop_duplicates("matricule").set_index("matricule")["id_personnel"]
    map_service = d_service.drop_duplicates("code_service").set_index("code_service")["id_service"]
    map_type = d_type.drop_duplicates("code_type_pointage").set_index("code_type_pointage")["id_type_pointage"]
    map_retard = d_retard.drop_duplicates("code_etat_retard").set_index("code_etat_retard")["id_etat_retard"]
    map_societe = d_societe.drop_duplicates("code_societe").set_index("code_societe")["id_societe"]
    # -----------------------------
    # Traitement par chunks AVANT conversions lourdes
    # -----------------------------
    source_chunk_size = 100000
    total_rows = len(fact)

    for start in range(0, total_rows, source_chunk_size):
        chunk = fact.iloc[start:start + source_chunk_size].copy()

        # préparation légère sur le chunk
        chunk["date_point"] = pd.to_datetime(chunk["date_point"], errors="coerce").dt.normalize()
        chunk["matricule"] = chunk["matricule"].astype("string").str.strip()
        chunk["code_service"] = chunk["code_service"].astype("string").str.strip()
        chunk["code_type_pointage"] = chunk["code_type_pointage"].astype("string").str.strip()
        chunk["code_etat_retard"] = chunk["code_etat_retard"].astype("string").str.strip()
        chunk["code_soc"] = chunk["code_soc"].astype("string").str.strip()
        chunk["id_societe"] = chunk["code_soc"].map(map_societe)
        # mapping sur le chunk
        chunk["id_temps"] = chunk["date_point"].map(map_temps)
        chunk["id_personnel"] = chunk["matricule"].map(map_personnel)
        chunk["id_service"] = chunk["code_service"].map(map_service)
        chunk["id_type_pointage"] = chunk["code_type_pointage"].map(map_type)
        chunk["id_etat_retard"] = chunk["code_etat_retard"].map(map_retard)
        chunk["id_etat_retard"] = chunk["id_etat_retard"].fillna(0)

        # conversions sur le chunk seulement
        for col in [
            "id_temps", "id_personnel", "id_service", "id_societe",
            "id_type_pointage", "id_etat_retard",
            "nb_pointage"
        ]:
            chunk[col] = pd.to_numeric(chunk[col], errors="coerce")

        for col in ["ret_min", "duree_tot"]:
            chunk[col] = pd.to_numeric(chunk[col], errors="coerce")


        chunk = chunk[[
            "id_temps", "id_personnel", "id_service", "id_type_pointage", "id_etat_retard", "id_societe",
            "nb_pointage", "ret_min", "duree_tot"
        ]]

        chunk = chunk.dropna(subset=["id_temps", "id_personnel"])

        for col in [
            "id_temps", "id_personnel", "id_service", "id_societe",
            "id_type_pointage", "id_etat_retard",
            "nb_pointage"
        ]:
            chunk[col] = chunk[col].astype("Int64")

        chunk.to_sql(
            "f_pointage_retard",
            engine,
            if_exists="append",
            index=False,
            chunksize=5000,
            dtype={
                "id_temps": Integer(),
                "id_personnel": Integer(),
                "id_societe": Integer(),
                "id_service": Integer(),
                "id_type_pointage": Integer(),
                "id_etat_retard": Integer(),
                "nb_pointage": Integer(),
                "ret_min": Numeric(12, 2),
                "duree_tot": Numeric(12, 2),
            },
        )

        print(f"[LOAD] f_pointage_retard chunk chargé : {start + len(chunk)}/{total_rows}")

    print(f"[LOAD] f_pointage_retard chargé : {total_rows} lignes")

def run_load(transformed_data: dict):
    truncate_tables()
    load_dimensions(transformed_data["dimensions"])
    load_fact_effectif(transformed_data["facts"]["f_effectif_snapshot"])
    load_fact_conge(transformed_data["facts"]["f_demande_conge"])
    load_fact_pointage(transformed_data["facts"]["f_pointage_retard"])
    print("[LOAD] Chargement terminé.")