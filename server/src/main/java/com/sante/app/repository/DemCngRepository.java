package com.sante.app.repository;

import com.sante.app.model.leave.DemCng;
import com.sante.app.model.leave.DemCngId;
import com.sante.app.repository.projection.LeaveValidationProjection;
import com.sante.app.repository.projection.MyLeaveRequestProjection;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DemCngRepository extends JpaRepository<DemCng, DemCngId> {

    @Query(value = """
            SELECT COALESCE(MAX(d.\"NUM_DCNG\"), 0) + 1
            FROM \"DEM_CNG\" d
            WHERE d.\"COD_SOC\" = :codSoc
              AND d.\"MAT_PERS\" = :matPers
            """, nativeQuery = true)
    Integer findNextNumDcng(@Param("codSoc") String codSoc,
                            @Param("matPers") String matPers);

    @Query(value = """
            SELECT d.*
            FROM "DEM_CNG" d
            WHERE d."COD_SOC" = :codSoc
              AND d."MAT_PERS" = :matPers
            ORDER BY d."NUM_DCNG" DESC
            LIMIT 1
            """, nativeQuery = true)
    Optional<DemCng> findLatestRequest(@Param("codSoc") String codSoc,
                                       @Param("matPers") String matPers);

    @Query(value = """
            SELECT d.\"COD_SOC\" AS codSoc,
                   d.\"MAT_PERS\" AS matPers,
                   d.\"NUM_DCNG\" AS numDcng,
                   d.\"DAT_DCNG\" AS datDcng,
                   d.\"DAT_DEBUT\" AS datDebut,
                   d.\"DAT_FIN\" AS datFin,
                   d.\"CODE_M\" AS codeM,
                   m.\"LIB_MOT\" AS libMot,
                   d."MOTIF_CNG" AS motifCng,
                   d.\"NBR_JOURS\" AS nbrJours,
                       d."VALID" AS valid,
                       d."MOTIF_REFUS" AS motifRefus
            FROM \"DEM_CNG\" d
            LEFT JOIN \"MOTIF_J\" m ON m.\"COD_M\" = d.\"CODE_M\"
            WHERE d.\"COD_SOC\" = :codSoc
              AND d.\"MAT_PERS\" = :matPers
            ORDER BY d.\"DAT_DCNG\" DESC, d.\"NUM_DCNG\" DESC
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM \"DEM_CNG\" d
            WHERE d.\"COD_SOC\" = :codSoc
              AND d.\"MAT_PERS\" = :matPers
            """,
            nativeQuery = true)
    Page<MyLeaveRequestProjection> findMyRequests(@Param("codSoc") String codSoc,
                                                  @Param("matPers") String matPers,
                                                  Pageable pageable);

    @Query(value = """
            SELECT d.\"COD_SOC\" AS codSoc,
                   d.\"MAT_PERS\" AS matPers,
                   d.\"NUM_DCNG\" AS numDcng,
                   NULLIF(TRIM(CONCAT(COALESCE(p.\"PREN_PERS\", ''), ' ', COALESCE(p.\"NOM_PERS\", ''))), '') AS fullName,
                   p.\"COD_USER\" AS demandeurRole,
                   d.\"DAT_DCNG\" AS datDcng,
                   d.\"DAT_DEBUT\" AS datDebut,
                   d.\"DAT_FIN\" AS datFin,
                   d.\"CODE_M\" AS codeM,
                   m.\"LIB_MOT\" AS libMot,
                   d."MOTIF_CNG" AS motifCng,
                   d.\"NBR_JOURS\" AS nbrJours,
                   d."VALID" AS valid,
                   d."MOTIF_REFUS" AS motifRefus
            FROM \"DEM_CNG\" d
            JOIN \"PERSONNEL\" p
              ON p.\"COD_SOC\" = d.\"COD_SOC\"
             AND p.\"MAT_PERS\" = d.\"MAT_PERS\"
            LEFT JOIN \"MOTIF_J\" m ON m.\"COD_M\" = d.\"CODE_M\"
            WHERE d.\"COD_SOC\" = :codSoc
              AND p.\"COD_USER\" = 'AGENT'
              AND (:valid IS NULL OR d.\"VALID\" = :valid)
            ORDER BY d.\"DAT_DCNG\" DESC, d.\"NUM_DCNG\" DESC
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM \"DEM_CNG\" d
            JOIN \"PERSONNEL\" p
              ON p.\"COD_SOC\" = d.\"COD_SOC\"
             AND p.\"MAT_PERS\" = d.\"MAT_PERS\"
            WHERE d.\"COD_SOC\" = :codSoc
              AND p.\"COD_USER\" = 'AGENT'
              AND (:valid IS NULL OR d.\"VALID\" = :valid)
            """,
            nativeQuery = true)
    Page<LeaveValidationProjection> findValidationQueueForDirector(@Param("codSoc") String codSoc,
                                                                   @Param("valid") String valid,
                                                                   Pageable pageable);

    @Query(value = """
            SELECT d.\"COD_SOC\" AS codSoc,
                   d.\"MAT_PERS\" AS matPers,
                   d.\"NUM_DCNG\" AS numDcng,
                   NULLIF(TRIM(CONCAT(COALESCE(p.\"PREN_PERS\", ''), ' ', COALESCE(p.\"NOM_PERS\", ''))), '') AS fullName,
                   p.\"COD_USER\" AS demandeurRole,
                   d.\"DAT_DCNG\" AS datDcng,
                   d.\"DAT_DEBUT\" AS datDebut,
                   d.\"DAT_FIN\" AS datFin,
                   d.\"CODE_M\" AS codeM,
                   m.\"LIB_MOT\" AS libMot,
                   d."MOTIF_CNG" AS motifCng,
                   d.\"NBR_JOURS\" AS nbrJours,
                   d."VALID" AS valid,
                   d."MOTIF_REFUS" AS motifRefus
            FROM \"DEM_CNG\" d
            JOIN \"PERSONNEL\" p
              ON p.\"COD_SOC\" = d.\"COD_SOC\"
             AND p.\"MAT_PERS\" = d.\"MAT_PERS\"
            LEFT JOIN \"MOTIF_J\" m ON m.\"COD_M\" = d.\"CODE_M\"
            WHERE p.\"COD_USER\" = 'DIRECTEUR'
              AND d.\"COD_SOC\" <> '0001'
              AND (:valid IS NULL OR d.\"VALID\" = :valid)
            ORDER BY d.\"DAT_DCNG\" DESC, d.\"NUM_DCNG\" DESC
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM \"DEM_CNG\" d
            JOIN \"PERSONNEL\" p
              ON p.\"COD_SOC\" = d.\"COD_SOC\"
             AND p.\"MAT_PERS\" = d.\"MAT_PERS\"
            WHERE p.\"COD_USER\" = 'DIRECTEUR'
              AND d.\"COD_SOC\" <> '0001'
              AND (:valid IS NULL OR d.\"VALID\" = :valid)
            """,
            nativeQuery = true)
    Page<LeaveValidationProjection> findValidationQueueForMinistry(@Param("valid") String valid,
                                                                   Pageable pageable);

    @Query(value = """
            SELECT d.\"COD_SOC\" AS codSoc,
                   d.\"MAT_PERS\" AS matPers,
                   d.\"NUM_DCNG\" AS numDcng,
                   NULLIF(TRIM(CONCAT(COALESCE(p.\"PREN_PERS\", ''), ' ', COALESCE(p.\"NOM_PERS\", ''))), '') AS fullName,
                   p.\"COD_USER\" AS demandeurRole,
                   d.\"DAT_DCNG\" AS datDcng,
                   d.\"DAT_DEBUT\" AS datDebut,
                   d.\"DAT_FIN\" AS datFin,
                   d.\"CODE_M\" AS codeM,
                   m.\"LIB_MOT\" AS libMot,
                   d.\"NBR_JOURS\" AS nbrJours,
                   d."VALID" AS valid,
                   d."MOTIF_REFUS" AS motifRefus
            FROM \"DEM_CNG\" d
            JOIN \"PERSONNEL\" p
              ON p.\"COD_SOC\" = d.\"COD_SOC\"
             AND p.\"MAT_PERS\" = d.\"MAT_PERS\"
            LEFT JOIN \"MOTIF_J\" m ON m.\"COD_M\" = d.\"CODE_M\"
            WHERE d.\"COD_SOC\" = :codSoc
              AND d.\"MAT_PERS\" = :matPers
              AND d.\"NUM_DCNG\" = :numDcng
            """, nativeQuery = true)
    Optional<LeaveValidationProjection> findValidationProjectionById(@Param("codSoc") String codSoc,
                                                                     @Param("matPers") String matPers,
                                                                     @Param("numDcng") Integer numDcng);
}
