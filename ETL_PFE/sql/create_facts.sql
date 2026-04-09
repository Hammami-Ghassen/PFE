CREATE SCHEMA IF NOT EXISTS dw;

-- =========================================================
-- FAIT 1 : EFFECTIF RH
-- Grain : 1 ligne par agent par date de snapshot
-- =========================================================
CREATE TABLE IF NOT EXISTS dw.f_effectif_snapshot (
    id_effectif_snapshot    BIGSERIAL PRIMARY KEY,
    id_temps                INT NOT NULL,
    id_personnel            INT NOT NULL,
    id_service              INT,
    id_gouvernorat          INT,
    id_grade                INT,
    id_etat_act             INT,
    id_sexe                 INT,
    nb_agent                INT NOT NULL DEFAULT 1,
    age                     INT,
    anciennete_jours        INT,

    CONSTRAINT fk_f_effectif_temps
        FOREIGN KEY (id_temps) REFERENCES dw.d_temps(id_temps),

    CONSTRAINT fk_f_effectif_personnel
        FOREIGN KEY (id_personnel) REFERENCES dw.d_personnel(id_personnel),

    CONSTRAINT fk_f_effectif_service
        FOREIGN KEY (id_service) REFERENCES dw.d_service(id_service),

    CONSTRAINT fk_f_effectif_gouvernorat
        FOREIGN KEY (id_gouvernorat) REFERENCES dw.d_gouvernorat(id_gouvernorat),

    CONSTRAINT fk_f_effectif_grade
        FOREIGN KEY (id_grade) REFERENCES dw.d_grade(id_grade),

    CONSTRAINT fk_f_effectif_etat_act
        FOREIGN KEY (id_etat_act) REFERENCES dw.d_etat_act(id_etat_act),

    CONSTRAINT fk_f_effectif_sexe
        FOREIGN KEY (id_sexe) REFERENCES dw.d_sexe(id_sexe),

    CONSTRAINT uq_f_effectif_snapshot
        UNIQUE (id_temps, id_personnel)
);

CREATE INDEX IF NOT EXISTS idx_f_effectif_temps
    ON dw.f_effectif_snapshot(id_temps);

CREATE INDEX IF NOT EXISTS idx_f_effectif_personnel
    ON dw.f_effectif_snapshot(id_personnel);


-- =========================================================
-- FAIT 2 : CONGES
-- Grain : 1 ligne par demande (COD_SOC, MAT_PERS, NUM_DCNG)
-- =========================================================
CREATE TABLE IF NOT EXISTS dw.f_demande_conge (
    id_demande_conge        BIGSERIAL PRIMARY KEY,
    code_soc                VARCHAR(50),
    num_demande_conge       VARCHAR(50),
    id_temps_demande        INT,
    id_temps_debut          INT,
    id_temps_fin            INT,
    id_personnel            INT NOT NULL,
    id_service              INT,
    id_motif_conge          INT,
    id_statut_conge         INT,
    nb_demande              INT NOT NULL DEFAULT 1,
    nbr_jours               NUMERIC(12,2),
    nbr_heures              NUMERIC(12,2),
    nbr_jours_cal           NUMERIC(12,2),
    est_justifie            BOOLEAN DEFAULT FALSE,
    nb_justificatifs        INT DEFAULT 0,

    CONSTRAINT fk_f_conge_temps_demande
        FOREIGN KEY (id_temps_demande) REFERENCES dw.d_temps(id_temps),

    CONSTRAINT fk_f_conge_temps_debut
        FOREIGN KEY (id_temps_debut) REFERENCES dw.d_temps(id_temps),

    CONSTRAINT fk_f_conge_temps_fin
        FOREIGN KEY (id_temps_fin) REFERENCES dw.d_temps(id_temps),

    CONSTRAINT fk_f_conge_personnel
        FOREIGN KEY (id_personnel) REFERENCES dw.d_personnel(id_personnel),

    CONSTRAINT fk_f_conge_service
        FOREIGN KEY (id_service) REFERENCES dw.d_service(id_service),

    CONSTRAINT fk_f_conge_motif
        FOREIGN KEY (id_motif_conge) REFERENCES dw.d_motif_conge(id_motif_conge),

    CONSTRAINT fk_f_conge_statut
        FOREIGN KEY (id_statut_conge) REFERENCES dw.d_statut_conge(id_statut_conge),

    CONSTRAINT uq_f_demande_conge
        UNIQUE (code_soc, id_personnel, num_demande_conge)
);

CREATE INDEX IF NOT EXISTS idx_f_conge_personnel
    ON dw.f_demande_conge(id_personnel);

CREATE INDEX IF NOT EXISTS idx_f_conge_temps_debut
    ON dw.f_demande_conge(id_temps_debut);


-- =========================================================
-- FAIT 3 : POINTAGE / RETARD
-- Grain : 1 ligne par événement de pointage
-- Si l'événement est lié à un retard, on remplit les mesures retard
-- =========================================================
CREATE TABLE IF NOT EXISTS dw.f_pointage_retard (
    id_pointage_retard      BIGSERIAL PRIMARY KEY,
    id_temps                INT NOT NULL,
    id_personnel            INT NOT NULL,
    id_service              INT,
    id_type_pointage        INT,
    id_etat_retard          INT,
    nb_pointage             INT NOT NULL DEFAULT 1,
    nb_retard               INT NOT NULL DEFAULT 0,
    est_retard              BOOLEAN DEFAULT FALSE,
    ret_min                 NUMERIC(12,2),
    duree_tot               NUMERIC(12,2),

    CONSTRAINT fk_f_pointage_temps
        FOREIGN KEY (id_temps) REFERENCES dw.d_temps(id_temps),

    CONSTRAINT fk_f_pointage_personnel
        FOREIGN KEY (id_personnel) REFERENCES dw.d_personnel(id_personnel),

    CONSTRAINT fk_f_pointage_service
        FOREIGN KEY (id_service) REFERENCES dw.d_service(id_service),

    CONSTRAINT fk_f_pointage_type
        FOREIGN KEY (id_type_pointage) REFERENCES dw.d_type_pointage(id_type_pointage),

    CONSTRAINT fk_f_pointage_etat_retard
        FOREIGN KEY (id_etat_retard) REFERENCES dw.d_etat_retard(id_etat_retard)
);

CREATE INDEX IF NOT EXISTS idx_f_pointage_retard_temps
    ON dw.f_pointage_retard(id_temps);

CREATE INDEX IF NOT EXISTS idx_f_pointage_retard_personnel
    ON dw.f_pointage_retard(id_personnel);