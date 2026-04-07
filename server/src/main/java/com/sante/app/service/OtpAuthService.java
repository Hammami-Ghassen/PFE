package com.sante.app.service;

import com.sante.app.dto.request.OtpChannel;
import com.sante.app.dto.response.AuthProfileResponse;
import com.sante.app.dto.response.AuthResponse;
import com.sante.app.exception.BadRequestException;
import com.sante.app.exception.UnauthorizedException;
import com.sante.app.model.auth.AuthRefreshToken;
import com.sante.app.model.legacy.AdrPers;
import com.sante.app.model.legacy.Personnel;
import com.sante.app.model.legacy.Societe;
import com.sante.app.repository.AdrPersRepository;
import com.sante.app.repository.AuthRefreshTokenRepository;
import com.sante.app.repository.PersonnelRepository;
import com.sante.app.repository.SocieteRepository;
import com.sante.app.security.jwt.JwtProperties;
import com.sante.app.security.jwt.JwtTokenProvider;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpAuthService {

    private static final int OTP_TTL_SECONDS = 300;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final PersonnelRepository personnelRepository;
    private final AdrPersRepository adrPersRepository;
    private final SocieteRepository societeRepository;
    private final StringRedisTemplate redisTemplate;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final LegacyRoleMapper legacyRoleMapper;
    private final AuthRefreshTokenRepository authRefreshTokenRepository;

    @Transactional(readOnly = true)
    public void requestOtp(String matPers, OtpChannel channel) {
        String normalizedMatPers = normalizeMatPers(matPers);
        Personnel personnel = personnelRepository.findById(normalizedMatPers)
                .orElseThrow(() -> new UnauthorizedException("MAT_PERS introuvable."));

        AdrPers adrPers = adrPersRepository.findById(normalizedMatPers)
                .orElseThrow(() -> new BadRequestException("Aucun contact trouvé pour ce personnel."));

        String target = resolveTarget(channel, adrPers);
        String otp = generateOtp();
        String hash = sha256(otp);

        redisTemplate.opsForValue().set(redisKey(normalizedMatPers), hash, Duration.ofSeconds(OTP_TTL_SECONDS));

        log.info("Mock OTP dispatch via {} to {} for MAT_PERS {}", channel, maskTarget(target), normalizedMatPers);
        log.debug("DEV OTP for MAT_PERS {}: {}", normalizedMatPers, otp);

        // Keep role lookup touched for early validation during request phase.
        legacyRoleMapper.toAppRole(personnel.getCodUser());
    }

    @Transactional
    public TokenSession verifyOtp(String matPers, String otp) {
        String normalizedMatPers = normalizeMatPers(matPers);
        Personnel personnel = personnelRepository.findById(normalizedMatPers)
                .orElseThrow(() -> new UnauthorizedException("MAT_PERS introuvable."));

        String key = redisKey(normalizedMatPers);
        String storedHash = redisTemplate.opsForValue().get(key);
        if (storedHash == null) {
            throw new UnauthorizedException("OTP expiré ou non demandé.");
        }

        String incomingHash = sha256(otp);
        if (!MessageDigest.isEqual(storedHash.getBytes(StandardCharsets.UTF_8), incomingHash.getBytes(StandardCharsets.UTF_8))) {
            throw new UnauthorizedException("OTP invalide.");
        }

        redisTemplate.delete(key);

        String appRole = legacyRoleMapper.toAppRole(personnel.getCodUser());
        String accessToken = jwtTokenProvider.generateAccessToken(normalizedMatPers, appRole);
        String refreshToken = jwtTokenProvider.generateRefreshToken(normalizedMatPers);
        persistRefreshToken(normalizedMatPers, refreshToken);

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn(jwtProperties.getAccessTokenExpiration() / 1000)
                .matPers(normalizedMatPers)
                .role(appRole)
                .build();

        return TokenSession.builder()
                .authResponse(authResponse)
                .refreshToken(refreshToken)
                .build();
    }

    @Transactional
    public TokenSession refresh(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken) || !"refresh".equals(jwtTokenProvider.getTokenType(refreshToken))) {
            throw new UnauthorizedException("Refresh token invalide.");
        }

        String tokenHash = sha256(refreshToken);
        AuthRefreshToken stored = authRefreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Refresh token inconnu."));

        if (Boolean.TRUE.equals(stored.getRevoked())) {
            authRefreshTokenRepository.revokeAllByMatPers(stored.getMatPers(), LocalDateTime.now());
            throw new UnauthorizedException("Refresh token révoqué. Reconnexion requise.");
        }

        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Refresh token expiré.");
        }

        stored.setRevoked(true);
        stored.setRevokedAt(LocalDateTime.now());
        authRefreshTokenRepository.save(stored);

        Personnel personnel = personnelRepository.findById(stored.getMatPers())
                .orElseThrow(() -> new UnauthorizedException("Personnel introuvable."));

        String appRole = legacyRoleMapper.toAppRole(personnel.getCodUser());
        String newAccessToken = jwtTokenProvider.generateAccessToken(stored.getMatPers(), appRole);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(stored.getMatPers());
        persistRefreshToken(stored.getMatPers(), newRefreshToken);

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken(newAccessToken)
                .tokenType("Bearer")
                .expiresIn(jwtProperties.getAccessTokenExpiration() / 1000)
                .matPers(stored.getMatPers())
                .role(appRole)
                .build();

        return TokenSession.builder()
                .authResponse(authResponse)
                .refreshToken(newRefreshToken)
                .build();
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }

        String hash = sha256(refreshToken);
        Optional<AuthRefreshToken> token = authRefreshTokenRepository.findByTokenHash(hash);
        token.ifPresent(t -> {
            t.setRevoked(true);
            t.setRevokedAt(LocalDateTime.now());
            authRefreshTokenRepository.save(t);
            authRefreshTokenRepository.revokeAllByMatPers(t.getMatPers(), LocalDateTime.now());
        });
    }

    @Transactional(readOnly = true)
    public AuthProfileResponse getProfile(String matPers) {
        String normalizedMatPers = normalizeMatPers(matPers);
        Personnel personnel = personnelRepository.findById(normalizedMatPers)
                .orElseThrow(() -> new UnauthorizedException("Personnel introuvable."));

        AdrPers adrPers = adrPersRepository.findById(normalizedMatPers).orElse(null);
        Societe societe = societeRepository.findById(personnel.getCodSoc()).orElse(null);

        return AuthProfileResponse.builder()
                .matPers(personnel.getMatPers())
            .role(legacyRoleMapper.toAppRole(personnel.getCodUser()))
                .codUser(personnel.getCodUser())
                .codSoc(personnel.getCodSoc())
                .establishmentName(societe == null ? null : societe.getLibSoc())
                .email(adrPers == null ? null : adrPers.getAdrElectronique())
                .phone(adrPers == null ? null : adrPers.getTelPertPers())
                .build();
    }

    private void persistRefreshToken(String matPers, String refreshToken) {
        AuthRefreshToken token = new AuthRefreshToken();
        token.setMatPers(matPers);
        token.setTokenHash(sha256(refreshToken));
        token.setExpiresAt(LocalDateTime.now().plusSeconds(jwtProperties.getRefreshTokenExpiration() / 1000));
        token.setRevoked(false);
        authRefreshTokenRepository.save(token);
    }

    private String normalizeMatPers(String matPers) {
        if (matPers == null || matPers.isBlank()) {
            throw new BadRequestException("MAT_PERS est obligatoire.");
        }
        String normalized = matPers.trim();
        if (!normalized.matches("\\d{8}")) {
            throw new BadRequestException("MAT_PERS doit contenir exactement 8 chiffres.");
        }
        return normalized;
    }

    private String resolveTarget(OtpChannel channel, AdrPers adrPers) {
        return switch (channel) {
            case EMAIL -> requireTarget(adrPers.getAdrElectronique(), "Adresse email indisponible.");
            case SMS -> requireTarget(adrPers.getTelPertPers(), "Numéro de téléphone indisponible.");
        };
    }

    private String requireTarget(String target, String message) {
        if (target == null || target.isBlank()) {
            throw new BadRequestException(message);
        }
        return target;
    }

    private String redisKey(String matPers) {
        return "otp:" + matPers;
    }

    private String generateOtp() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    private String maskTarget(String target) {
        if (target.length() <= 4) {
            return "****";
        }
        return target.substring(0, 2) + "****" + target.substring(target.length() - 2);
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

    @Builder
    public record TokenSession(AuthResponse authResponse, String refreshToken) {
    }
}
