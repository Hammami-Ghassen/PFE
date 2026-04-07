package com.sante.app.repository;

import com.sante.app.model.legacy.Personnel;
import com.sante.app.repository.projection.AuthProfileProjection;
import com.sante.app.repository.projection.PersonnelAdminProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PersonnelRepository extends JpaRepository<Personnel, String> {

    @Query(value = """
            SELECT p.\"MAT_PERS\" AS matPers,
                   p.\"COD_USER\" AS codUser,
                   p.\"COD_SOC\" AS codSoc,
                   s.\"LIB_SOC\" AS libSoc,
                   a.\"ADR_ELECTRONIQUE\" AS adrElectronique,
                   a.\"TEL_PERT_PERS\" AS telPertPers
            FROM \"PERSONNEL\" p
            LEFT JOIN \"SOCIETE\" s ON s.\"COD_SOC\" = p.\"COD_SOC\"
            LEFT JOIN \"ADR_PERS\" a ON a.\"MAT_PERS\" = p.\"MAT_PERS\"
            WHERE (:search IS NULL OR p.\"MAT_PERS\" ILIKE CONCAT('%', :search, '%'))
              AND (:codSoc IS NULL OR p.\"COD_SOC\" = :codSoc)
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM \"PERSONNEL\" p
            WHERE (:search IS NULL OR p.\"MAT_PERS\" ILIKE CONCAT('%', :search, '%'))
              AND (:codSoc IS NULL OR p.\"COD_SOC\" = :codSoc)
            """,
            nativeQuery = true)
    Page<PersonnelAdminProjection> searchPersonnel(@Param("search") String search,
                                                   @Param("codSoc") String codSoc,
                                                   Pageable pageable);

    @Query(value = """
            SELECT p.\"MAT_PERS\" AS matPers,
                   p.\"COD_USER\" AS codUser,
                   p.\"COD_SOC\" AS codSoc,
                   s.\"LIB_SOC\" AS libSoc,
                   a.\"ADR_ELECTRONIQUE\" AS adrElectronique,
                   a.\"TEL_PERT_PERS\" AS telPertPers
            FROM \"PERSONNEL\" p
            LEFT JOIN \"SOCIETE\" s ON s.\"COD_SOC\" = p.\"COD_SOC\"
            LEFT JOIN \"ADR_PERS\" a ON a.\"MAT_PERS\" = p.\"MAT_PERS\"
            WHERE p.\"MAT_PERS\" = :matPers
            """, nativeQuery = true)
    PersonnelAdminProjection findAdminProjectionByMatPers(@Param("matPers") String matPers);

    @Modifying
    @Query(value = "UPDATE \"PERSONNEL\" SET \"COD_USER\" = :codUser WHERE \"MAT_PERS\" = :matPers", nativeQuery = true)
    int updateCodUser(@Param("matPers") String matPers, @Param("codUser") String codUser);

    // Single-query profile projection reduces auth/profile hydration to one DB roundtrip.
    @Query(value = """
        SELECT p.\"MAT_PERS\" AS matPers,
             p.\"PREN_PERS\" AS firstName,
             p.\"NOM_PERS\" AS lastName,
             p.\"COD_USER\" AS codUser,
             p.\"COD_SOC\" AS codSoc,
             s.\"LIB_SOC\" AS establishmentName,
             a.\"ADR_ELECTRONIQUE\" AS email,
             a.\"TEL_PERT_PERS\" AS phone
        FROM \"PERSONNEL\" p
        LEFT JOIN \"SOCIETE\" s ON s.\"COD_SOC\" = p.\"COD_SOC\"
        LEFT JOIN \"ADR_PERS\" a ON a.\"MAT_PERS\" = p.\"MAT_PERS\"
        WHERE p.\"MAT_PERS\" = :matPers
        """, nativeQuery = true)
    AuthProfileProjection findAuthProfileByMatPers(@Param("matPers") String matPers);
}
