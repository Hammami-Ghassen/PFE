CREATE SCHEMA IF NOT EXISTS dw;

-- =========================================================
-- 1) D_TEMPS
-- =========================================================
INSERT INTO dw.d_temps (
    date_complete,
    jour,
    mois,
    trimestre,
    annee,
    semaine_annee,
    nom_jour,
    nom_mois,
    est_weekend
)
SELECT
    d::date AS date_complete,
    EXTRACT(DAY FROM d)::smallint AS jour,
    EXTRACT(MONTH FROM d)::smallint AS mois,
    EXTRACT(QUARTER FROM d)::smallint AS trimestre,
    EXTRACT(YEAR FROM d)::smallint AS annee,
    EXTRACT(WEEK FROM d)::smallint AS semaine_annee,
    TO_CHAR(d, 'Day') AS nom_jour,
    TO_CHAR(d, 'Month') AS nom_mois,
    CASE
        WHEN EXTRACT(ISODOW FROM d) IN (6, 7) THEN TRUE
        ELSE FALSE
    END AS est_weekend
FROM generate_series(
    DATE '2024-01-01',
    DATE '2025-12-31',
    INTERVAL '1 day'
) AS d
ON CONFLICT (date_complete) DO NOTHING;

-- =========================================================
-- 2) D_SERVICE
-- =========================================================
INSERT INTO dw.d_service (code_service, libelle_service)
SELECT DISTINCT
    TRIM(p."COD_SERV"::text) AS code_service,
    TRIM(p."COD_SERV"::text) AS libelle_service
FROM public."PERSONNEL" p
WHERE p."COD_SERV" IS NOT NULL
  AND TRIM(p."COD_SERV"::text) <> ''
ON CONFLICT (code_service) DO NOTHING;

-- =========================================================
-- 3) D_GOUVERNORAT
-- =========================================================
INSERT INTO dw.d_gouvernorat (code_gouvernorat, libelle_gouvernorat)
SELECT DISTINCT
    TRIM(p."COD_GOUV"::text) AS code_gouvernorat,
    TRIM(p."COD_GOUV"::text) AS libelle_gouvernorat
FROM public."PERSONNEL" p
WHERE p."COD_GOUV" IS NOT NULL
  AND TRIM(p."COD_GOUV"::text) <> ''
ON CONFLICT (code_gouvernorat) DO NOTHING;

-- =========================================================
-- 4) D_GRADE
-- =========================================================
INSERT INTO dw.d_grade (code_grade, libelle_grade)
SELECT DISTINCT
    TRIM(p."COD_GRAD"::text) AS code_grade,
    TRIM(p."COD_GRAD"::text) AS libelle_grade
FROM public."PERSONNEL" p
WHERE p."COD_GRAD" IS NOT NULL
  AND TRIM(p."COD_GRAD"::text) <> ''
ON CONFLICT (code_grade) DO NOTHING;

-- =========================================================
-- 5) D_ETAT_ACT
-- =========================================================
INSERT INTO dw.d_etat_act (code_etat_act, libelle_etat_act)
SELECT DISTINCT
    TRIM(p."ETAT_ACT"::text) AS code_etat_act,
    CASE TRIM(p."ETAT_ACT"::text)
        WHEN '0' THEN 'Actif'
        WHEN '1' THEN 'Etat 1'
        WHEN '5' THEN 'Etat 5'
        WHEN '8' THEN 'Etat 8'
        ELSE 'Autre etat'
    END AS libelle_etat_act
FROM public."PERSONNEL" p
WHERE p."ETAT_ACT" IS NOT NULL
ON CONFLICT (code_etat_act) DO NOTHING;

-- =========================================================
-- 6) D_SEXE
-- =========================================================
INSERT INTO dw.d_sexe (code_sexe, libelle_sexe)
SELECT DISTINCT
    TRIM(p."SEXE"::text) AS code_sexe,
    CASE UPPER(TRIM(p."SEXE"::text))
        WHEN 'M' THEN 'Masculin'
        WHEN 'F' THEN 'Feminin'
        ELSE 'Non defini'
    END AS libelle_sexe
FROM public."PERSONNEL" p
WHERE p."SEXE" IS NOT NULL
  AND TRIM(p."SEXE"::text) <> ''
ON CONFLICT (code_sexe) DO NOTHING;

-- =========================================================
-- 7) D_PERSONNEL
-- Adapte NOM_PERS / PRENOM / DAT_NAISS / DAT_RECRUT
-- si un de ces noms diffère dans ta table
-- =========================================================
INSERT INTO dw.d_personnel (
    matricule,
    nom,
    prenom,
    date_naissance,
    date_recrutement,
    code_service,
    code_gouvernorat,
    code_grade,
    code_etat_act,
    code_sexe
)
SELECT DISTINCT
    TRIM(p."MAT_PERS"::text) AS matricule,
    NULLIF(TRIM(COALESCE(p."NOM_PERS"::text, '')), '') AS nom,
    NULLIF(TRIM(COALESCE(p."PREN_PERS"::text, '')), '') AS prenom,
    p."DAT_NAIS" AS date_naissance,
    p."DAT_EMB" AS date_recrutement,
    NULLIF(TRIM(COALESCE(p."COD_SERV"::text, '')), '') AS code_service,
    NULLIF(TRIM(COALESCE(p."COD_GOUV"::text, '')), '') AS code_gouvernorat,
    NULLIF(TRIM(COALESCE(p."COD_GRAD"::text, '')), '') AS code_grade,
    NULLIF(TRIM(COALESCE(p."ETAT_ACT"::text, '')), '') AS code_etat_act,
    NULLIF(TRIM(COALESCE(p."SEXE"::text, '')), '') AS code_sexe
FROM public."PERSONNEL" p
WHERE p."MAT_PERS" IS NOT NULL
  AND TRIM(p."MAT_PERS"::text) <> ''
ON CONFLICT (matricule) DO NOTHING;

-- =========================================================
-- 8) D_MOTIF_CONGE
-- =========================================================
INSERT INTO dw.d_motif_conge (
    code_motif_conge,
    libelle_motif_conge
)
SELECT DISTINCT
    TRIM(dc."CODE_M"::text) AS code_motif_conge,
    TRIM(dc."CODE_M"::text) AS libelle_motif_conge
FROM public."DEM_CNG" dc
WHERE dc."CODE_M" IS NOT NULL
  AND TRIM(dc."CODE_M"::text) <> ''
ON CONFLICT (code_motif_conge) DO NOTHING;

-- =========================================================
-- 9) D_STATUT_CONGE
-- =========================================================
INSERT INTO dw.d_statut_conge (
    valid_code,
    etat_cng_code,
    nat_cng_code,
    libelle_statut
)
SELECT DISTINCT
    NULLIF(TRIM(COALESCE(dc."VALID"::text, '')), '') AS valid_code,
    NULLIF(TRIM(COALESCE(dc."ETAT_CNG"::text, '')), '') AS etat_cng_code,
    NULLIF(TRIM(COALESCE(dc."NAT_CNG"::text, '')), '') AS nat_cng_code,
    CONCAT(
        'VALID=', COALESCE(TRIM(dc."VALID"::text), 'NULL'),
        ' | ETAT_CNG=', COALESCE(TRIM(dc."ETAT_CNG"::text), 'NULL'),
        ' | NAT_CNG=', COALESCE(TRIM(dc."NAT_CNG"::text), 'NULL')
    ) AS libelle_statut
FROM public."DEM_CNG" dc
WHERE dc."VALID" IS NOT NULL
   OR dc."ETAT_CNG" IS NOT NULL
   OR dc."NAT_CNG" IS NOT NULL
ON CONFLICT (valid_code, etat_cng_code, nat_cng_code) DO NOTHING;

-- =========================================================
-- 10) D_TYPE_POINTAGE
-- =========================================================
INSERT INTO dw.d_type_pointage (
    code_type_pointage,
    libelle_type_pointage
)
SELECT DISTINCT
    TRIM(po."TYP_POINT"::text) AS code_type_pointage,
    CASE UPPER(TRIM(po."TYP_POINT"::text))
        WHEN 'E' THEN 'Entree'
        WHEN 'S' THEN 'Sortie'
        ELSE 'Autre type de pointage'
    END AS libelle_type_pointage
FROM public."POINTER" po
WHERE po."TYP_POINT" IS NOT NULL
  AND TRIM(po."TYP_POINT"::text) <> ''
ON CONFLICT (code_type_pointage) DO NOTHING;

-- =========================================================
-- 11) D_ETAT_RETARD
-- =========================================================
INSERT INTO dw.d_etat_retard (
    code_etat_retard,
    libelle_etat_retard
)
VALUES ('RETARD', 'Retard constate')
ON CONFLICT (code_etat_retard) DO NOTHING;