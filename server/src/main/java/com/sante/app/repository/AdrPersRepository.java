package com.sante.app.repository;

import com.sante.app.model.legacy.AdrPers;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

public interface AdrPersRepository extends JpaRepository<AdrPers, String> {

	@Query(value = "SELECT COUNT(*) FROM \"ADR_PERS\" WHERE \"MAT_PERS\" = :matPers", nativeQuery = true)
	long countByMatPers(@Param("matPers") String matPers);

	@Query(value = "SELECT \"RUE\" FROM \"ADR_PERS\" WHERE \"MAT_PERS\" = :matPers", nativeQuery = true)
	String findRueByMatPers(@Param("matPers") String matPers);

	@Query(value = "SELECT \"TEL_PORT_PERS\" FROM \"ADR_PERS\" WHERE \"MAT_PERS\" = :matPers", nativeQuery = true)
	String findTelPortPersByMatPers(@Param("matPers") String matPers);

	@Query(value = "SELECT \"ADR_ELECTRONIQUE\" FROM \"ADR_PERS\" WHERE \"MAT_PERS\" = :matPers", nativeQuery = true)
	String findAdrElectroniqueByMatPers(@Param("matPers") String matPers);

	@Modifying
	@Query(value = "UPDATE \"ADR_PERS\" SET \"RUE\" = :rue WHERE \"MAT_PERS\" = :matPers", nativeQuery = true)
	int updateRue(@Param("matPers") String matPers, @Param("rue") String rue);

	@Modifying
	@Query(value = "UPDATE \"ADR_PERS\" SET \"TEL_PORT_PERS\" = :telephone WHERE \"MAT_PERS\" = :matPers", nativeQuery = true)
	int updateTelPortPers(@Param("matPers") String matPers, @Param("telephone") String telephone);

	@Modifying
	@Query(value = "UPDATE \"ADR_PERS\" SET \"ADR_ELECTRONIQUE\" = :email WHERE \"MAT_PERS\" = :matPers", nativeQuery = true)
	int updateAdrElectronique(@Param("matPers") String matPers, @Param("email") String email);

	@Modifying
	@Query(value = """
			INSERT INTO "ADR_PERS" ("COD_SOC", "MAT_PERS", "NUM_ADR", "ADR_ELECTRONIQUE", "TEL_PORT_PERS")
			VALUES (:codSoc, :matPers, 1, :email, :telephone)
			""", nativeQuery = true)
	int insertContactRow(@Param("codSoc") String codSoc,
			@Param("matPers") String matPers,
			@Param("email") String email,
			@Param("telephone") String telephone);
}
