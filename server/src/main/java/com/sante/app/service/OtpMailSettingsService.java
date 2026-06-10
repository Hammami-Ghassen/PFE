package com.sante.app.service;

import com.sante.app.dto.request.OtpMailSettingsRequest;
import com.sante.app.dto.response.OtpMailSettingsResponse;
import com.sante.app.exception.BadRequestException;
import com.sante.app.model.auth.OtpMailSettings;
import com.sante.app.model.auth.OtpMailSecurityMode;
import com.sante.app.repository.OtpMailSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OtpMailSettingsService {

    private static final Long SETTINGS_ID = 1L;

    private final OtpMailSettingsRepository repository;
    private final AppConfigEncryptionService encryptionService;

    @Value("${spring.mail.host:smtp.gmail.com}")
    private String fallbackHost;

    @Value("${spring.mail.port:587}")
    private Integer fallbackPort;

    @Value("${spring.mail.username:}")
    private String fallbackUsername;

    @Value("${spring.mail.password:}")
    private String fallbackPassword;

    @Value("${spring.mail.properties.mail.smtp.auth:true}")
    private Boolean fallbackSmtpAuth;

    @Value("${spring.mail.properties.mail.smtp.starttls.enable:true}")
    private Boolean fallbackStarttlsEnable;

    @Transactional(readOnly = true)
    public OtpMailSettingsResponse getSettings() {
        return repository.findById(SETTINGS_ID)
                .map(settings -> toResponse(settings, "DATABASE"))
                .orElseGet(() -> toResponse(fallbackSettings(), "ENV_FALLBACK"));
    }

    @Transactional(readOnly = true)
    public ActiveOtpMailSettings getActiveSettings() {
        return repository.findById(SETTINGS_ID)
                .map(settings -> new ActiveOtpMailSettings(
                        settings.getHost(),
                        settings.getPort(),
                        trimToNull(settings.getUsername()),
                        encryptionService.decrypt(settings.getPasswordEncrypted()),
                        Boolean.TRUE.equals(settings.getSmtpAuth()),
                        resolveSecurityMode(settings),
                        trimToNull(settings.getFromAddress())))
                .orElseGet(() -> new ActiveOtpMailSettings(
                        trimToNull(fallbackHost),
                        fallbackPort,
                        trimToNull(fallbackUsername),
                        trimToNull(fallbackPassword),
                        Boolean.TRUE.equals(fallbackSmtpAuth),
                        fallbackSecurityMode(),
                        trimToNull(fallbackUsername)));
    }

    @Transactional
    public OtpMailSettingsResponse updateSettings(OtpMailSettingsRequest request) {
        OtpMailSettings settings = repository.findById(SETTINGS_ID).orElseGet(() -> {
            OtpMailSettings created = new OtpMailSettings();
            created.setId(SETTINGS_ID);
            return created;
        });

        validate(request, settings);

        settings.setHost(request.host().trim());
        settings.setPort(request.port());
        settings.setUsername(trimToNull(request.username()));
        settings.setSmtpAuth(request.smtpAuth());
        settings.setSecurityMode(request.securityMode());
        settings.setStarttlsEnable(request.securityMode() == OtpMailSecurityMode.STARTTLS);
        settings.setFromAddress(trimToNull(request.fromAddress()));
        if (request.password() != null && !request.password().isBlank()) {
            settings.setPasswordEncrypted(encryptionService.encrypt(request.password()));
        }

        return toResponse(repository.save(settings), "DATABASE");
    }

    private void validate(OtpMailSettingsRequest request, OtpMailSettings existing) {
        if (request.host() == null || request.host().isBlank()) {
            throw new BadRequestException("Le serveur SMTP est obligatoire.");
        }
        if (request.port() == null || request.port() < 1) {
            throw new BadRequestException("Le port SMTP doit etre superieur a 0.");
        }
        if (request.securityMode() == null) {
            throw new BadRequestException("Le type de securite SMTP est obligatoire.");
        }
        if (Boolean.TRUE.equals(request.smtpAuth()) && trimToNull(request.username()) == null) {
            throw new BadRequestException("Le nom d'utilisateur SMTP est obligatoire lorsque l'authentification est active.");
        }
        boolean hasExistingPassword = existing.getPasswordEncrypted() != null && !existing.getPasswordEncrypted().isBlank();
        if (Boolean.TRUE.equals(request.smtpAuth()) && !hasExistingPassword
                && (request.password() == null || request.password().isBlank())) {
            throw new BadRequestException("Le mot de passe SMTP est obligatoire lors de la premiere configuration authentifiee.");
        }
    }

    private OtpMailSettings fallbackSettings() {
        OtpMailSettings settings = new OtpMailSettings();
        settings.setHost(trimToNull(fallbackHost));
        settings.setPort(fallbackPort);
        settings.setUsername(trimToNull(fallbackUsername));
        settings.setPasswordEncrypted(trimToNull(fallbackPassword));
        settings.setSmtpAuth(Boolean.TRUE.equals(fallbackSmtpAuth));
        settings.setSecurityMode(fallbackSecurityMode());
        settings.setStarttlsEnable(Boolean.TRUE.equals(fallbackStarttlsEnable));
        settings.setFromAddress(trimToNull(fallbackUsername));
        return settings;
    }

    private OtpMailSettingsResponse toResponse(OtpMailSettings settings, String source) {
        return new OtpMailSettingsResponse(
                settings.getHost(),
                settings.getPort(),
                settings.getUsername(),
                settings.getPasswordEncrypted() != null && !settings.getPasswordEncrypted().isBlank(),
                settings.getSmtpAuth(),
                resolveSecurityMode(settings),
                settings.getFromAddress(),
                source,
                settings.getUpdatedAt());
    }

    private OtpMailSecurityMode resolveSecurityMode(OtpMailSettings settings) {
        if (settings.getSecurityMode() != null) {
            return settings.getSecurityMode();
        }
        return Boolean.TRUE.equals(settings.getStarttlsEnable()) ? OtpMailSecurityMode.STARTTLS : OtpMailSecurityMode.NONE;
    }

    private OtpMailSecurityMode fallbackSecurityMode() {
        return Boolean.TRUE.equals(fallbackStarttlsEnable) ? OtpMailSecurityMode.STARTTLS : OtpMailSecurityMode.NONE;
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    public record ActiveOtpMailSettings(
            String host,
            Integer port,
            String username,
            String password,
            boolean smtpAuth,
            OtpMailSecurityMode securityMode,
            String fromAddress
    ) {
    }
}
