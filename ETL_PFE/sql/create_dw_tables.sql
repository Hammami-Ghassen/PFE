CREATE TABLE IF NOT EXISTS d_temps (
    id_temps SERIAL PRIMARY KEY,
    date_complete DATE UNIQUE NOT NULL,
    jour SMALLINT, mois SMALLINT, trimestre SMALLINT, annee SMALLINT,
    semaine_annee SMALLINT, nom_jour VARCHAR(20), nom_mois VARCHAR(20),
    est_weekend BOOLEAN
);

CREATE TABLE IF NOT EXISTS d_service (
    id_service SERIAL PRIMARY KEY,
    code_service VARCHAR(50) NOT NULL,
    libelle_service VARCHAR(255),
    cle_service_source VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS d_etablissement (
    id_etablissement SERIAL PRIMARY KEY,
    code_etablissement VARCHAR(50) UNIQUE NOT NULL,
    libelle_etablissement VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS d_gouvernorat (
    id_gouvernorat SERIAL PRIMARY KEY,
    code_gouvernorat VARCHAR(50) UNIQUE NOT NULL,
    libelle_gouvernorat VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS d_grade (
    id_grade SERIAL PRIMARY KEY,
    code_grade VARCHAR(50) NOT NULL,
    libelle_grade VARCHAR(255),
    code_categ VARCHAR(50) NOT NULL,
    code_cat VARCHAR(50) NOT NULL,
    CONSTRAINT uq_d_grade UNIQUE (code_categ, code_cat, code_grade)
);


CREATE TABLE IF NOT EXISTS d_personnel (
    id_personnel SERIAL PRIMARY KEY,
    matricule VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(150),
    prenom VARCHAR(150),
    date_naissance DATE,
    date_recrutement DATE
);

CREATE TABLE IF NOT EXISTS d_motif_conge (
    id_motif_conge SERIAL PRIMARY KEY,
    code_motif_conge VARCHAR(50) UNIQUE NOT NULL,
    code_type_conge VARCHAR(50),
    libelle_motif_conge VARCHAR(255),
    libelle_type_conge VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS d_statut_demande_conge (
    id_statut_demande_conge SERIAL PRIMARY KEY,
    valid_code VARCHAR(10),
    libelle_statut_demande VARCHAR(255)
);


CREATE TABLE IF NOT EXISTS d_type_pointage (
    id_type_pointage SERIAL PRIMARY KEY,
    code_type_pointage VARCHAR(10) UNIQUE NOT NULL,
    libelle_type_pointage VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS d_etat_retard (
    id_etat_retard INT PRIMARY KEY,
    code_etat_retard VARCHAR(20) UNIQUE NOT NULL,
    libelle_etat_retard VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS f_effectif_snapshot (
    id_effectif_snapshot BIGSERIAL PRIMARY KEY,
    id_temps INT,
    id_personnel INT,
    id_etablissement INT,
    id_service INT,
    id_gouvernorat INT,
    id_grade INT,
    code_sexe VARCHAR(10),
    nb_agent INT,
    age INT,
    anciennete_jours INT
);

CREATE TABLE IF NOT EXISTS f_demande_conge (
    id_demande_conge BIGSERIAL PRIMARY KEY,
    id_temps_debut INT,
    id_temps_fin INT,
    id_personnel INT,
    id_etablissement INT,
    id_service INT,
    id_motif_conge INT,
    id_statut_demande_conge INT,
    nb_demande INT,
    nbr_jours NUMERIC(12,2),
    est_justifie BOOLEAN,
    nb_justificatifs INT
);

CREATE TABLE IF NOT EXISTS f_pointage_retard (
    id_pointage_retard BIGSERIAL PRIMARY KEY,
    id_temps INT,
    id_personnel INT,
    id_etablissement INT,
    id_service INT,
    id_type_pointage INT,
    id_etat_retard INT,
    nb_pointage INT,
    ret_min NUMERIC(12,2),
    duree_tot NUMERIC(12,2)
);



ALTER TABLE d_service ADD COLUMN IF NOT EXISTS code_service_parent VARCHAR(50);
ALTER TABLE d_service ADD COLUMN IF NOT EXISTS type_service VARCHAR(100);

CREATE TABLE IF NOT EXISTS public.user_societe_access (
    id_access BIGSERIAL PRIMARY KEY,
    cod_user VARCHAR(50) NOT NULL,
    adr_electronique VARCHAR(255) NOT NULL,
    cod_soc VARCHAR(4) NOT NULL,
    access_all BOOLEAN NOT NULL DEFAULT FALSE,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    date_sync TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_societe_access_cod_user_soc
    ON public.user_societe_access (cod_user, cod_soc);

CREATE INDEX IF NOT EXISTS idx_user_societe_access_email
    ON public.user_societe_access (adr_electronique);

CREATE INDEX IF NOT EXISTS idx_user_societe_access_soc
    ON public.user_societe_access (cod_soc);


CREATE TABLE IF NOT EXISTS d_axe (
    id_axe SERIAL PRIMARY KEY,
    code_axe VARCHAR(50) UNIQUE NOT NULL,
    libelle_axe VARCHAR(255)
);

ALTER TABLE f_effectif_snapshot
ADD COLUMN IF NOT EXISTS id_axe INT;