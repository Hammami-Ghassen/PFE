WITH checks AS (
    SELECT
        'd_personnel_unique_natural_key'::TEXT AS check_name,
        CASE WHEN COUNT(*) = 0 THEN TRUE ELSE FALSE END AS passed,
        COUNT(*)::BIGINT AS fail_count,
        'Duplicate (cod_soc, mat_pers) in d_personnel'::TEXT AS details
    FROM (
        SELECT cod_soc, mat_pers
        FROM d_personnel
        GROUP BY cod_soc, mat_pers
        HAVING COUNT(*) > 1
    ) q

    UNION ALL

    SELECT
        'f_demande_conge_unique_natural_key'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN TRUE ELSE FALSE END,
        COUNT(*)::BIGINT,
        'Duplicate (cod_soc, mat_pers, num_dcng) in f_demande_conge'::TEXT
    FROM (
        SELECT cod_soc, mat_pers, num_dcng
        FROM f_demande_conge
        GROUP BY cod_soc, mat_pers, num_dcng
        HAVING COUNT(*) > 1
    ) q

    UNION ALL

    SELECT
        'f_effectif_nb_agent_is_1'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN TRUE ELSE FALSE END,
        COUNT(*)::BIGINT,
        'Rows where nb_agent is not equal to 1 in f_effectif_snapshot'::TEXT
    FROM f_effectif_snapshot
    WHERE nb_agent <> 1

    UNION ALL

    SELECT
        'facts_not_empty_phase1'::TEXT,
        CASE WHEN (
            (SELECT COUNT(*) FROM f_effectif_snapshot) > 0
            AND (SELECT COUNT(*) FROM f_demande_conge) > 0
            AND (SELECT COUNT(*) FROM f_pointage) > 0
            AND (SELECT COUNT(*) FROM f_retard_journalier) > 0
        ) THEN TRUE ELSE FALSE END,
        CASE WHEN (
            (SELECT COUNT(*) FROM f_effectif_snapshot) > 0
            AND (SELECT COUNT(*) FROM f_demande_conge) > 0
            AND (SELECT COUNT(*) FROM f_pointage) > 0
            AND (SELECT COUNT(*) FROM f_retard_journalier) > 0
        ) THEN 0 ELSE 1 END,
        'Phase 1 facts must be populated'::TEXT

    UNION ALL

    SELECT
        'pointage_coverage_vs_effectif'::TEXT,
        CASE WHEN coverage_ratio >= 0.85 THEN TRUE ELSE FALSE END,
        CASE WHEN coverage_ratio >= 0.85 THEN 0 ELSE 1 END,
        CONCAT('Coverage ratio = ', ROUND(coverage_ratio::NUMERIC, 4), ' (target >= 0.85)')::TEXT
    FROM (
        SELECT
            CASE
                WHEN effectif_count = 0 THEN 0::DOUBLE PRECISION
                ELSE pointage_count::DOUBLE PRECISION / effectif_count::DOUBLE PRECISION
            END AS coverage_ratio
        FROM (
            SELECT
                (SELECT COUNT(DISTINCT personnel_key) FROM f_effectif_snapshot WHERE personnel_key <> 0) AS effectif_count,
                (SELECT COUNT(DISTINCT personnel_key) FROM f_pointage WHERE personnel_key <> 0) AS pointage_count
        ) c
    ) cov

    UNION ALL

    SELECT
        'justificatif_coverage_vs_demande'::TEXT,
        CASE WHEN coverage_ratio >= 0.05 THEN TRUE ELSE FALSE END,
        CASE WHEN coverage_ratio >= 0.05 THEN 0 ELSE 1 END,
        CONCAT('Coverage ratio = ', ROUND(coverage_ratio::NUMERIC, 4), ' (target >= 0.05)')::TEXT
    FROM (
        SELECT
            CASE
                WHEN demande_count = 0 THEN 0::DOUBLE PRECISION
                ELSE justif_count::DOUBLE PRECISION / demande_count::DOUBLE PRECISION
            END AS coverage_ratio
        FROM (
            SELECT
                (SELECT COUNT(*) FROM f_demande_conge) AS demande_count,
                (SELECT COUNT(*) FROM f_justificatif_conge) AS justif_count
        ) c
    ) cov
)
SELECT check_name, passed, fail_count, details
FROM checks
ORDER BY check_name;
