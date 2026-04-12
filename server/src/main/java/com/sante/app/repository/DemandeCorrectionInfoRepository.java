package com.sante.app.repository;

import com.sante.app.model.correction.DemandeCorrectionInfo;
import com.sante.app.repository.projection.CorrectionAdminProjection;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DemandeCorrectionInfoRepository extends JpaRepository<DemandeCorrectionInfo, Long> {

    @Query(value = """
            SELECT d.\"ID\" AS id,
                   d.\"MAT_PERS\" AS matPers,
                   NULLIF(TRIM(CONCAT(COALESCE(p.\"PREN_PERS\", ''), ' ', COALESCE(p.\"NOM_PERS\", ''))), '') AS fullName,
                   d.\"ATTRIBUT_CIBLE\" AS attributCible,
                   d.\"ANCIENNE_VALEUR\" AS ancienneValeur,
                   d.\"NOUVELLE_VALEUR\" AS nouvelleValeur,
                   d.\"STATUT\" AS statut,
                   d.\"DATE_DEMANDE\" AS dateDemande,
                   CASE
                     WHEN d.\"PIECE_JOINTE\" IS NULL OR octet_length(d.\"PIECE_JOINTE\") = 0 THEN FALSE
                     ELSE TRUE
                   END AS hasAttachment
            FROM \"DEMANDE_CORRECTION_INFO\" d
            LEFT JOIN \"PERSONNEL\" p ON p.\"MAT_PERS\" = d.\"MAT_PERS\"
            WHERE (:status IS NULL OR d.\"STATUT\" = :status)
            ORDER BY d.\"DATE_DEMANDE\" DESC
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM \"DEMANDE_CORRECTION_INFO\" d
            WHERE (:status IS NULL OR d.\"STATUT\" = :status)
            """,
            nativeQuery = true)
    Page<CorrectionAdminProjection> findForAdmin(@Param("status") String status, Pageable pageable);

    @Query(value = """
            SELECT d.\"ID\" AS id,
                   d.\"MAT_PERS\" AS matPers,
                   NULLIF(TRIM(CONCAT(COALESCE(p.\"PREN_PERS\", ''), ' ', COALESCE(p.\"NOM_PERS\", ''))), '') AS fullName,
                   d.\"ATTRIBUT_CIBLE\" AS attributCible,
                   d.\"ANCIENNE_VALEUR\" AS ancienneValeur,
                   d.\"NOUVELLE_VALEUR\" AS nouvelleValeur,
                   d.\"STATUT\" AS statut,
                   d.\"DATE_DEMANDE\" AS dateDemande,
                   CASE
                     WHEN d.\"PIECE_JOINTE\" IS NULL OR octet_length(d.\"PIECE_JOINTE\") = 0 THEN FALSE
                     ELSE TRUE
                   END AS hasAttachment
            FROM \"DEMANDE_CORRECTION_INFO\" d
            LEFT JOIN \"PERSONNEL\" p ON p.\"MAT_PERS\" = d.\"MAT_PERS\"
            WHERE d.\"ID\" = :id
            """, nativeQuery = true)
    Optional<CorrectionAdminProjection> findAdminProjectionById(@Param("id") Long id);
}
