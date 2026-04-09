CREATE SCHEMA IF NOT EXISTS dw;

-- =========================================================
-- DIMENSION TEMPS
-- =========================================================
CREATE TABLE IF NOT EXISTS dw.d_temps (
    id_temps            SERIAL PRIMARY KEY,
    date_complete       DATE NOT NULL UNIQUE,
    jour                SMALLINT NOT NULL,
    mois                SMALLINT NOT NULL,
    trimestre           SMALLINT NOT NULL,
    annee               SMALLINT NOT NULL,
    semaine_annee       SMALLINT,
    nom_jour            VARCHAR(20),
    nom_mois            VARCHAR(20),
    est_weekend         BOOLEAN DEFAULT FALSE
);

-- =========================================================
-- DIMENSIONS RH COMMUNES
-- =========================================================
CREATE TABLE IF NOT EXISTS dw.d_service (
    id_service          SERIAL PRIMARY KEY,
    code_service        VARCHAR(50) NOT NULL UNIQUE,
    libelle_service     VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS dw.d_gouvernorat (
    id_gouvernorat      SERIAL PRIMARY KEY,
    code_gouvernorat    VARCHAR(50) NOT NULL UNIQUE,
    libelle_gouvernorat VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS dw.d_grade (
    id_grade            SERIAL PRIMARY KEY,
    code_grade          VARCHAR(50) NOT NULL UNIQUE,
    libelle_grade       VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS dw.d_etat_act (
    id_etat_act         SERIAL PRIMARY KEY,
    code_etat_act       VARCHAR(50) NOT NULL UNIQUE,
    libelle_etat_act    VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS dw.d_sexe (
    id_sexe             SERIAL PRIMARY KEY,
    code_sexe           VARCHAR(10) NOT NULL UNIQUE,
    libelle_sexe        VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS dw.d_personnel (
    id_personnel        SERIAL PRIMARY KEY,
    matricule           VARCHAR(50) NOT NULL UNIQUE,
    nom                 VARCHAR(150),
    prenom              VARCHAR(150),
    date_naissance      DATE,
    date_recrutement    DATE,
    code_service        VARCHAR(50),
    code_gouvernorat    VARCHAR(50),
    code_grade          VARCHAR(50),
    code_etat_act       VARCHAR(50),
    code_sexe           VARCHAR(10)
);

-- =========================================================
-- DIMENSIONS CONGES
-- D_STATUT_CONGE regroupe VALID / ETAT_CNG / NAT_CNG
-- =========================================================
CREATE TABLE IF NOT EXISTS dw.d_motif_conge (
    id_motif_conge      SERIAL PRIMARY KEY,
    code_motif_conge    VARCHAR(50) NOT NULL UNIQUE,
    libelle_motif_conge VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS dw.d_statut_conge (
    id_statut_conge     SERIAL PRIMARY KEY,
    valid_code          VARCHAR(10),
    etat_cng_code       VARCHAR(10),
    nat_cng_code        VARCHAR(10),
    libelle_statut      VARCHAR(255),
    CONSTRAINT uq_statut_conge UNIQUE (valid_code, etat_cng_code, nat_cng_code)
);

-- =========================================================
-- DIMENSIONS POINTAGE / RETARD
-- =========================================================
CREATE TABLE IF NOT EXISTS dw.d_type_pointage (
    id_type_pointage    SERIAL PRIMARY KEY,
    code_type_pointage  VARCHAR(10) NOT NULL UNIQUE,
    libelle_type_pointage VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS dw.d_etat_retard (
    id_etat_retard      SERIAL PRIMARY KEY,
    code_etat_retard    VARCHAR(50) NOT NULL UNIQUE,
    libelle_etat_retard VARCHAR(255)
);

-- =========================================================
-- INDEX UTILES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_d_personnel_matricule
    ON dw.d_personnel (matricule);

CREATE INDEX IF NOT EXISTS idx_d_personnel_code_service
    ON dw.d_personnel (code_service);

CREATE INDEX IF NOT EXISTS idx_d_personnel_code_gouv
    ON dw.d_personnel (code_gouvernorat);

CREATE INDEX IF NOT EXISTS idx_d_personnel_code_grade
    ON dw.d_personnel (code_grade);