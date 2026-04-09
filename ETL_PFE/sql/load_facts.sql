CREATE SCHEMA IF NOT EXISTS dw;

-- =========================================================
-- FULL REFRESH DES FACTS
-- =========================================================
TRUNCATE TABLE
    dw.f_pointage_retard,
    dw.f_demande_conge,
    dw.f_effectif_snapshot
RESTART IDENTITY;

-- =========================================================
-- 1) F_EFFECTIF_SNAPSHOT
-- Grain : 1 ligne par agent par date de snapshot
-- =========================================================
INSERT INTO dw.f_effectif_snapshot (
    id_temps,
    id_personnel,
    id_service,
    id_gouvernorat,
    id_grade,
    id_etat_act,
    id_sexe,
    nb_agent,
    age,
    anciennete_jours
)
SELECT
    dt.id_temps,
    dp.id_personnel,
    ds.id_service,
    dg.id_gouvernorat,
    dgr.id_grade,
    dea.id_etat_act,
    dse.id_sexe,
    1 AS nb_agent,
    CASE
        WHEN dp.date_naissance IS NOT NULL
        THEN EXTRACT(YEAR FROM age(dt.date_complete, dp.date_naissance))::int
        ELSE NULL
    END AS age,
    CASE
        WHEN dp.date_recrutement IS NOT NULL
        THEN (dt.date_complete - dp.date_recrutement)
        ELSE NULL
    END AS anciennete_jours
FROM dw.d_personnel dp
JOIN dw.d_temps dt
    ON dt.date_complete = (SELECT MAX(date_complete) FROM dw.d_temps)
LEFT JOIN dw.d_service ds
    ON ds.code_service = dp.code_service
LEFT JOIN dw.d_gouvernorat dg
    ON dg.code_gouvernorat = dp.code_gouvernorat
LEFT JOIN dw.d_grade dgr
    ON dgr.code_grade = dp.code_grade
LEFT JOIN dw.d_etat_act dea
    ON dea.code_etat_act = dp.code_etat_act
LEFT JOIN dw.d_sexe dse
    ON dse.code_sexe = dp.code_sexe;

-- =========================================================
-- 2) F_DEMANDE_CONGE
-- Grain : 1 ligne par demande (COD_SOC, MAT_PERS, NUM_DCNG)
-- =========================================================
WITH justif AS (
    SELECT
        TRIM(j."COD_SOC"::text) AS cod_soc_n,
        TRIM(j."MAT_PERS"::text) AS mat_pers_n,
        TRIM(j."NUM_DCNG"::text) AS num_dcng_n,
        COUNT(*)::int AS nb_justificatifs
    FROM public."JUSTIF_DEM_CNG" j
    GROUP BY
        TRIM(j."COD_SOC"::text),
        TRIM(j."MAT_PERS"::text),
        TRIM(j."NUM_DCNG"::text)
),
demande_dedup AS (
    SELECT *
    FROM (
        SELECT
            dc.*,
            TRIM(dc."COD_SOC"::text) AS cod_soc_n,
            TRIM(dc."MAT_PERS"::text) AS mat_pers_n,
            TRIM(dc."NUM_DCNG"::text) AS num_dcng_n,
            ROW_NUMBER() OVER (
                PARTITION BY
                    TRIM(dc."COD_SOC"::text),
                    TRIM(dc."MAT_PERS"::text),
                    TRIM(dc."NUM_DCNG"::text)
                ORDER BY dc."DAT_DEBUT" NULLS LAST
            ) AS rn
        FROM public."DEM_CNG" dc
    ) x
    WHERE x.rn = 1
)
INSERT INTO dw.f_demande_conge (
    code_soc,
    num_demande_conge,
    id_temps_demande,
    id_temps_debut,
    id_temps_fin,
    id_personnel,
    id_service,
    id_motif_conge,
    id_statut_conge,
    nb_demande,
    nbr_jours,
    nbr_heures,
    nbr_jours_cal,
    est_justifie,
    nb_justificatifs
)
SELECT
    dd.cod_soc_n AS code_soc,
    dd.num_dcng_n AS num_demande_conge,
    NULL::int AS id_temps_demande,
    dt_debut.id_temps AS id_temps_debut,
    NULL::int AS id_temps_fin,
    dp.id_personnel,
    ds.id_service,
    dmc.id_motif_conge,
    dsc.id_statut_conge,
    1 AS nb_demande,
    dd."NBR_JOURS"::numeric(12,2) AS nbr_jours,
    NULL::numeric(12,2) AS nbr_heures,
    NULL::numeric(12,2) AS nbr_jours_cal,
    CASE
        WHEN COALESCE(j.nb_justificatifs, 0) > 0 THEN TRUE
        ELSE FALSE
    END AS est_justifie,
    COALESCE(j.nb_justificatifs, 0) AS nb_justificatifs
FROM demande_dedup dd
JOIN dw.d_personnel dp
    ON dp.matricule = dd.mat_pers_n
LEFT JOIN dw.d_service ds
    ON ds.code_service = dp.code_service
LEFT JOIN dw.d_temps dt_debut
    ON dt_debut.date_complete = dd."DAT_DEBUT"
LEFT JOIN dw.d_motif_conge dmc
    ON dmc.code_motif_conge = TRIM(dd."CODE_M"::text)
LEFT JOIN dw.d_statut_conge dsc
    ON dsc.valid_code    IS NOT DISTINCT FROM NULLIF(TRIM(COALESCE(dd."VALID"::text, '')), '')
   AND dsc.etat_cng_code IS NOT DISTINCT FROM NULLIF(TRIM(COALESCE(dd."ETAT_CNG"::text, '')), '')
   AND dsc.nat_cng_code  IS NOT DISTINCT FROM NULLIF(TRIM(COALESCE(dd."NAT_CNG"::text, '')), '')
LEFT JOIN justif j
    ON j.cod_soc_n  = dd.cod_soc_n
   AND j.mat_pers_n = dd.mat_pers_n
   AND j.num_dcng_n = dd.num_dcng_n
ON CONFLICT (code_soc, id_personnel, num_demande_conge) DO NOTHING;


-- =========================================================
-- 3) F_POINTAGE_RETARD
-- Grain : 1 ligne par événement de pointage
-- DUREE_TOT convertie en minutes
-- =========================================================
WITH retard_aggr AS (
    SELECT
        rj."MAT_PERS",
        rj."DAT_POINT",
        COUNT(*)::int AS nb_retard,
        SUM(
            CASE
                WHEN rj."DUREE_TOT" IS NULL OR TRIM(rj."DUREE_TOT"::text) = '' THEN 0
                WHEN TRIM(rj."DUREE_TOT"::text) ~ '^[0-9]+(\.[0-9]+)?$'
                    THEN TRIM(rj."DUREE_TOT"::text)::numeric
                WHEN TRIM(rj."DUREE_TOT"::text) ~ '^[0-9]+h[0-9]+m$'
                    THEN split_part(TRIM(rj."DUREE_TOT"::text), 'h', 1)::numeric * 60
                       + regexp_replace(split_part(TRIM(rj."DUREE_TOT"::text), 'h', 2), 'm$', '')::numeric
                WHEN TRIM(rj."DUREE_TOT"::text) ~ '^[0-9]+h$'
                    THEN regexp_replace(TRIM(rj."DUREE_TOT"::text), 'h$', '')::numeric * 60
                WHEN TRIM(rj."DUREE_TOT"::text) ~ '^[0-9]+m$'
                    THEN regexp_replace(TRIM(rj."DUREE_TOT"::text), 'm$', '')::numeric
                ELSE 0
            END
        )::numeric(12,2) AS duree_retard
    FROM public."RETARD_JOURNEE" rj
    GROUP BY rj."MAT_PERS", rj."DAT_POINT"
),
pointage_base AS (
    SELECT
        po."MAT_PERS",
        po."DATE_POINT",
        po."TYP_POINT",
        CASE
            WHEN po."DUREE_TOT" IS NULL OR TRIM(po."DUREE_TOT"::text) = '' THEN 0
            WHEN TRIM(po."DUREE_TOT"::text) ~ '^[0-9]+(\.[0-9]+)?$'
                THEN TRIM(po."DUREE_TOT"::text)::numeric
            WHEN TRIM(po."DUREE_TOT"::text) ~ '^[0-9]+h[0-9]+m$'
                THEN split_part(TRIM(po."DUREE_TOT"::text), 'h', 1)::numeric * 60
                   + regexp_replace(split_part(TRIM(po."DUREE_TOT"::text), 'h', 2), 'm$', '')::numeric
            WHEN TRIM(po."DUREE_TOT"::text) ~ '^[0-9]+h$'
                THEN regexp_replace(TRIM(po."DUREE_TOT"::text), 'h$', '')::numeric * 60
            WHEN TRIM(po."DUREE_TOT"::text) ~ '^[0-9]+m$'
                THEN regexp_replace(TRIM(po."DUREE_TOT"::text), 'm$', '')::numeric
            ELSE 0
        END::numeric(12,2) AS duree_tot_num,
        ROW_NUMBER() OVER (
            PARTITION BY po."MAT_PERS", po."DATE_POINT"
            ORDER BY po."TYP_POINT"
        ) AS rn
    FROM public."POINTER" po
    WHERE po."MAT_PERS" IS NOT NULL
      AND po."DATE_POINT" IS NOT NULL
)
INSERT INTO dw.f_pointage_retard (
    id_temps,
    id_personnel,
    id_service,
    id_type_pointage,
    id_etat_retard,
    nb_pointage,
    nb_retard,
    est_retard,
    ret_min,
    duree_tot
)
SELECT
    dt.id_temps,
    dp.id_personnel,
    ds.id_service,
    dtp.id_type_pointage,
    CASE
        WHEN pb.rn = 1 AND COALESCE(ra.nb_retard, 0) > 0 THEN der.id_etat_retard
        ELSE NULL
    END AS id_etat_retard,
    1 AS nb_pointage,
    CASE
        WHEN pb.rn = 1 THEN COALESCE(ra.nb_retard, 0)
        ELSE 0
    END AS nb_retard,
    CASE
        WHEN pb.rn = 1 AND COALESCE(ra.nb_retard, 0) > 0 THEN TRUE
        ELSE FALSE
    END AS est_retard,
    CASE
        WHEN pb.rn = 1 THEN COALESCE(ra.duree_retard, 0)
        ELSE 0
    END AS ret_min,
    pb.duree_tot_num AS duree_tot
FROM pointage_base pb
JOIN dw.d_personnel dp
    ON dp.matricule = TRIM(pb."MAT_PERS"::text)
LEFT JOIN dw.d_service ds
    ON ds.code_service = dp.code_service
LEFT JOIN dw.d_temps dt
    ON dt.date_complete = pb."DATE_POINT"
LEFT JOIN dw.d_type_pointage dtp
    ON dtp.code_type_pointage = TRIM(pb."TYP_POINT"::text)
LEFT JOIN retard_aggr ra
    ON ra."MAT_PERS"  = pb."MAT_PERS"
   AND ra."DAT_POINT" = pb."DATE_POINT"
LEFT JOIN dw.d_etat_retard der
    ON der.code_etat_retard = 'RETARD';