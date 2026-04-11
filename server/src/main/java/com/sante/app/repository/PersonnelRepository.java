package com.sante.app.repository;

import com.sante.app.model.legacy.Personnel;
import com.sante.app.repository.projection.PersonnelAdminProjection;
import com.sante.app.repository.projection.ProfileProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PersonnelRepository extends JpaRepository<Personnel, String> {

    @Query(value = """
            SELECT p."MAT_PERS" AS matPers,
                   p."COD_USER" AS codUser,
                   p."COD_SOC" AS codSoc,
                   s."LIB_SOC" AS libSoc,
                   a."ADR_ELECTRONIQUE" AS adrElectronique,
                   a."TEL_PERT_PERS" AS telPertPers
            FROM "PERSONNEL" p
            LEFT JOIN "SOCIETE" s ON s."COD_SOC" = p."COD_SOC"
            LEFT JOIN "ADR_PERS" a ON a."MAT_PERS" = p."MAT_PERS"
            WHERE (:search IS NULL OR p."MAT_PERS" ILIKE CONCAT('%', :search, '%'))
              AND (:codSoc IS NULL OR p."COD_SOC" = :codSoc)
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM "PERSONNEL" p
            WHERE (:search IS NULL OR p."MAT_PERS" ILIKE CONCAT('%', :search, '%'))
              AND (:codSoc IS NULL OR p."COD_SOC" = :codSoc)
            """,
            nativeQuery = true)
    Page<PersonnelAdminProjection> searchPersonnel(@Param("search") String search,
                                                   @Param("codSoc") String codSoc,
                                                   Pageable pageable);

    @Query(value = """
            SELECT p."MAT_PERS" AS matPers,
                   p."COD_USER" AS codUser,
                   p."COD_SOC" AS codSoc,
                   s."LIB_SOC" AS libSoc,
                   a."ADR_ELECTRONIQUE" AS adrElectronique,
                   a."TEL_PERT_PERS" AS telPertPers
            FROM "PERSONNEL" p
            LEFT JOIN "SOCIETE" s ON s."COD_SOC" = p."COD_SOC"
            LEFT JOIN "ADR_PERS" a ON a."MAT_PERS" = p."MAT_PERS"
            WHERE p."MAT_PERS" = :matPers
            """, nativeQuery = true)
    PersonnelAdminProjection findAdminProjectionByMatPers(@Param("matPers") String matPers);

    @Modifying
    @Query(value = "UPDATE \"PERSONNEL\" SET \"COD_USER\" = :codUser WHERE \"MAT_PERS\" = :matPers", nativeQuery = true)
    int updateCodUser(@Param("matPers") String matPers, @Param("codUser") String codUser);

    // Single-query profile projection reduces auth/profile hydration to one DB roundtrip.
    @Query(value = """
        SELECT p."MAT_PERS" AS matPers,
             p."PREN_PERS" AS firstName,
             p."NOM_PERS" AS lastName,
             p."COD_USER" AS codUser,
             p."COD_SOC" AS codSoc,
             s."LIB_SOC" AS establishmentName,
             a."ADR_ELECTRONIQUE" AS email,
             a."TEL_PERT_PERS" AS phone,
             a."RUE" AS rue,
             d."LIB_DELEG" AS libDeleg,
             gouv."LIB_GOUV" AS libGouv,
                      CASE
                             WHEN serv."SER_COD_SERV" IS NULL THEN serv."LIB_SERV"
                             WHEN servParent."LIB_SERV" IS NULL THEN serv."LIB_SERV"
                             ELSE CONCAT(serv."LIB_SERV", ', ', servParent."LIB_SERV")
                      END AS service,
             CAST(COALESCE(g."COD_GRAD", p."COD_GRAD") AS VARCHAR) AS grade,
             pt."LIB_POST" AS posteTravail
        FROM "PERSONNEL" p
        LEFT JOIN "SOCIETE" s ON s."COD_SOC" = p."COD_SOC"
        LEFT JOIN "ADR_PERS" a ON a."MAT_PERS" = p."MAT_PERS"
        LEFT JOIN "DELEGATION" d ON d."COD_DELEG" = a."COD_DELEG"
        LEFT JOIN "GOUVERNORAT" gouv ON gouv."COD_GOUV" = d."COD_GOUV"
        LEFT JOIN "SERVICE" serv ON serv."COD_SERV" = p."COD_SERV"
       LEFT JOIN "SERVICE" servParent ON servParent."COD_SERV" = serv."SER_COD_SERV"
       LEFT JOIN "POSTE_TRAV" pt ON pt."COD_POST" = p."POSTE_TRAV"
        LEFT JOIN "GRADE" g
               ON g."COD_GRAD" = p."COD_GRAD"
              AND g."COD_CAT" = p."COD_CAT"
              AND g."COD_CATEG" = p."COD_CATEG"
        WHERE p."MAT_PERS" = :matPers
        """, nativeQuery = true)
    ProfileProjection findAuthProfileByMatPers(@Param("matPers") String matPers);
}