package com.sante.app.service;

import com.sante.app.dto.response.AuthResponse;
import com.sante.app.model.auth.AuthRefreshToken;
import com.sante.app.repository.AuthRefreshTokenRepository;
import com.sante.app.security.jwt.JwtProperties;
import com.sante.app.security.jwt.JwtTokenProvider;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthTokenService {

    private static final int MAX_REFRESH_TOKEN_ATTEMPTS = 3;

    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final AuthRefreshTokenRepository authRefreshTokenRepository;

    // Centralizes JWT generation and refresh-token persistence to keep OtpAuthService focused on flow orchestration.
    public String generateAccessToken(String matPers, String appRole) {
        return jwtTokenProvider.generateAccessToken(matPers, appRole);
    }

    @Transactional
    public String issueAndPersistRefreshToken(String matPers) {
        for (int attempt = 1; attempt <= MAX_REFRESH_TOKEN_ATTEMPTS; attempt++) {
            String refreshToken = jwtTokenProvider.generateRefreshToken(matPers);
            try {
                persistRefreshToken(matPers, refreshToken);
                return refreshToken;
            } catch (DataIntegrityViolationException ex) {
                if (attempt == MAX_REFRESH_TOKEN_ATTEMPTS) {
                    throw new IllegalStateException("Impossible de generer un refresh token unique.", ex);
                }
                log.warn("Collision TOKEN_HASH detectee pour MAT_PERS {} (tentative {}).", matPers, attempt);
            }
        }
        throw new IllegalStateException("Impossible de generer un refresh token unique.");
    }

    @Transactional(readOnly = true)
    public Optional<AuthRefreshToken> findByRawRefreshToken(String rawRefreshToken) {
        return authRefreshTokenRepository.findByTokenHash(sha256(rawRefreshToken));
    }

    @Transactional
    public void revoke(AuthRefreshToken token) {
        token.setRevoked(true);
        token.setRevokedAt(LocalDateTime.now());
        authRefreshTokenRepository.save(token);
    }

    @Transactional
    public void revokeAllByMatPers(String matPers) {
        authRefreshTokenRepository.revokeAllByMatPers(matPers, LocalDateTime.now());
    }

    public AuthResponse toBearerAuthResponse(String accessToken, String matPers, String appRole) {
        return new AuthResponse(
                accessToken,
                null,
                "Bearer",
                jwtProperties.getAccessTokenExpiration() / 1000,
                matPers,
                appRole);
    }

    private void persistRefreshToken(String matPers, String refreshToken) {
        AuthRefreshToken token = new AuthRefreshToken();
        token.setMatPers(matPers);
        token.setTokenHash(sha256(refreshToken));
        token.setExpiresAt(LocalDateTime.now().plusSeconds(jwtProperties.getRefreshTokenExpiration() / 1000));
        token.setRevoked(false);
        authRefreshTokenRepository.save(token);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm indisponible", e);
        }
    }
}
