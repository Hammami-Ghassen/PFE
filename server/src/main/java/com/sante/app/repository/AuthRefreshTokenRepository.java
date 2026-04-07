package com.sante.app.repository;

import com.sante.app.model.auth.AuthRefreshToken;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuthRefreshTokenRepository extends JpaRepository<AuthRefreshToken, Long> {

    Optional<AuthRefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("UPDATE AuthRefreshToken t SET t.revoked = true, t.revokedAt = :now WHERE t.matPers = :matPers AND t.revoked = false")
    int revokeAllByMatPers(@Param("matPers") String matPers, @Param("now") LocalDateTime now);
}
