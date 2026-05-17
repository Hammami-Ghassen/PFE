package com.sante.app.service;

import com.sante.app.dto.request.OtpChannel;
import com.sante.app.dto.response.AuthProfileResponse;
import com.sante.app.dto.response.AuthResponse;
import com.sante.app.exception.BadRequestException;
import com.sante.app.exception.UnauthorizedException;
import com.sante.app.model.auth.AuthRefreshToken;
import com.sante.app.model.legacy.AdrPers;
import com.sante.app.model.legacy.Personnel;
import com.sante.app.repository.AdrPersRepository;
import com.sante.app.repository.PersonnelRepository;
import com.sante.app.repository.projection.ProfileProjection;
import com.sante.app.security.jwt.JwtTokenProvider;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpAuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final PersonnelRepository personnelRepository;
    private final AdrPersRepository adrPersRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final OtpStoreService otpStoreService;
    private final AuthTokenService authTokenService;
    private final OtpEmailService otpEmailService;

    // This service now orchestrates the auth workflow while delegating token and Redis concerns.

    @Transactional(readOnly = true)
    public void requestOtp(String matPers, OtpChannel channel) {
        String normalizedMatPers = normalizeMatPers(matPers);
        if (!otpStoreService.isOtpRequestAllowed(normalizedMatPers)) {
            throw new BadRequestException("Veuillez patienter avant de demander un nouveau code OTP.");
        }
        personnelRepository.findById(normalizedMatPers)
                .orElseThrow(() -> new UnauthorizedException("MAT_PERS introuvable."));

        AdrPers adrPers = adrPersRepository.findById(normalizedMatPers)
                .orElseThrow(() -> new BadRequestException("Aucun contact trouvé pour ce personnel."));

        String target = resolveTarget(channel, adrPers);
        String otp = generateOtp();
        String hash = sha256(otp);

        otpStoreService.storeOtpHash(normalizedMatPers, hash);

        dispatchOtp(channel, target, normalizedMatPers, otp);
    }

    @Transactional
    public TokenSession verifyOtp(String matPers, String otp) {
        String normalizedMatPers = normalizeMatPers(matPers);
        if (otpStoreService.isBlocked(normalizedMatPers)) {
            throw new BadRequestException("Trop de tentatives. Veuillez patienter 15 minutes.");
        }
        Personnel personnel = personnelRepository.findById(normalizedMatPers)
                .orElseThrow(() -> new UnauthorizedException("MAT_PERS introuvable."));

        String storedHash = otpStoreService.findOtpHash(normalizedMatPers);
        if (storedHash == null) {
            throw new UnauthorizedException("OTP non valide ou expiré.");
        }

        String incomingHash = sha256(otp);
        if (!MessageDigest.isEqual(storedHash.getBytes(StandardCharsets.UTF_8), incomingHash.getBytes(StandardCharsets.UTF_8))) {
            otpStoreService.incrementFailedAttempts(normalizedMatPers);
            if (otpStoreService.getFailedAttempts(normalizedMatPers) >= 5) {
                otpStoreService.deleteOtp(normalizedMatPers);
            }
            throw new UnauthorizedException("OTP invalide.");
        }

        otpStoreService.deleteOtp(normalizedMatPers);
        otpStoreService.clearFailedAttempts(normalizedMatPers);

        String appRole = personnel.getCodUser();
        String accessToken = authTokenService.generateAccessToken(normalizedMatPers, appRole);
        String refreshToken = authTokenService.issueAndPersistRefreshToken(normalizedMatPers);
        AuthResponse authResponse = authTokenService.toBearerAuthResponse(accessToken, normalizedMatPers, appRole);

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

        AuthRefreshToken stored = authTokenService.findByRawRefreshToken(refreshToken)
                .orElseThrow(() -> new UnauthorizedException("Refresh token inconnu."));

        // Guard against legacy/corrupted rows that may exist from previous auth implementations.
        if (stored.getMatPers() == null || stored.getMatPers().isBlank() || stored.getExpiresAt() == null) {
            authTokenService.revoke(stored);
            throw new UnauthorizedException("Session invalide. Reconnexion requise.");
        }

        if (Boolean.TRUE.equals(stored.getRevoked())) {
            authTokenService.revokeAllByMatPers(stored.getMatPers());
            throw new UnauthorizedException("Refresh token révoqué. Reconnexion requise.");
        }

        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Refresh token expiré.");
        }

        authTokenService.revoke(stored);

        Personnel personnel = personnelRepository.findById(stored.getMatPers())
                .orElseThrow(() -> new UnauthorizedException("Personnel introuvable."));

        String appRole = personnel.getCodUser();
        String newAccessToken;
        String newRefreshToken;
        try {
            newAccessToken = authTokenService.generateAccessToken(stored.getMatPers(), appRole);
            newRefreshToken = authTokenService.issueAndPersistRefreshToken(stored.getMatPers());
        } catch (IllegalStateException e) {
            throw new UnauthorizedException("Session invalide. Reconnexion requise.");
        }

        AuthResponse authResponse = authTokenService.toBearerAuthResponse(newAccessToken, stored.getMatPers(), appRole);

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

        authTokenService.findByRawRefreshToken(refreshToken).ifPresent(t -> {
            authTokenService.revoke(t);
            authTokenService.revokeAllByMatPers(t.getMatPers());
        });
    }

    @Transactional(readOnly = true)
    public AuthProfileResponse getProfile(String matPers) {
        String normalizedMatPers = normalizeMatPers(matPers);
        ProfileProjection profile = personnelRepository.findAuthProfileByMatPers(normalizedMatPers);
        if (profile == null) {
            throw new UnauthorizedException("Personnel introuvable.");
        }

        return new AuthProfileResponse(
                profile.getMatPers(),
                emptyToNull(profile.getFirstName()),
                emptyToNull(profile.getLastName()),
                buildFullName(profile.getFirstName(), profile.getLastName()),
                profile.getCodUser(),
                profile.getCodSoc(),
                profile.getEstablishmentName(),
                profile.getEmail(),
                profile.getPhone(),
                buildAdresse(profile.getRue(), profile.getLibDeleg(), profile.getLibGouv()),
                emptyToNull(profile.getService()),
                emptyToNull(profile.getGrade()),
                emptyToNull(profile.getPosteTravail()));
    }

    private String buildAdresse(String rue, String libDeleg, String libGouv) {
        ArrayList<String> parts = new ArrayList<>(3);
        addIfPresent(parts, rue);
        addIfPresent(parts, libDeleg);
        addIfPresent(parts, libGouv);
        if (parts.isEmpty()) {
            return null;
        }
        return String.join(", ", parts);
    }

    private void addIfPresent(ArrayList<String> parts, String value) {
        String normalized = emptyToNull(value);
        if (normalized != null) {
            parts.add(normalized);
        }
    }

    private String buildFullName(String firstName, String lastName) {
        String normalizedFirst = emptyToNull(firstName);
        String normalizedLast = emptyToNull(lastName);
        if (normalizedFirst == null && normalizedLast == null) {
            return null;
        }
        if (normalizedFirst == null) {
            return normalizedLast;
        }
        if (normalizedLast == null) {
            return normalizedFirst;
        }
        return normalizedFirst + " " + normalizedLast;
    }

    private String emptyToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
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
            case SMS -> requireTarget(adrPers.getTelPortPers(), "Numéro de téléphone indisponible.");
        };
    }

    private String requireTarget(String target, String message) {
        if (target == null || target.isBlank()) {
            throw new BadRequestException(message);
        }
        return target;
    }

    private void dispatchOtp(OtpChannel channel, String target, String normalizedMatPers, String otp) {
        switch (channel) {
            case EMAIL -> otpEmailService.sendOtp(target, normalizedMatPers, otp);
            case SMS -> {
                log.info("Mock OTP dispatch via {} to {} for MAT_PERS {}", channel, maskTarget(target), normalizedMatPers);
                log.debug("DEV OTP for MAT_PERS {}: {}", normalizedMatPers, otp);
            }
        }
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
        // OTP comparison still uses SHA-256 hashes so replay protection behavior remains unchanged.
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
