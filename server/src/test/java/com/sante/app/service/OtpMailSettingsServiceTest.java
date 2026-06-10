package com.sante.app.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sante.app.dto.request.OtpMailSettingsRequest;
import com.sante.app.exception.BadRequestException;
import com.sante.app.model.auth.OtpMailSettings;
import com.sante.app.model.auth.OtpMailSecurityMode;
import com.sante.app.repository.OtpMailSettingsRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class OtpMailSettingsServiceTest {

    @Mock
    private OtpMailSettingsRepository repository;

    private OtpMailSettingsService service;

    @BeforeEach
    void setUp() {
        AppConfigEncryptionService encryptionService =
                new AppConfigEncryptionService("12345678901234567890123456789012");
        service = new OtpMailSettingsService(repository, encryptionService);
        ReflectionTestUtils.setField(service, "fallbackHost", "env.smtp.test");
        ReflectionTestUtils.setField(service, "fallbackPort", 587);
        ReflectionTestUtils.setField(service, "fallbackUsername", "env-user@test.tn");
        ReflectionTestUtils.setField(service, "fallbackPassword", "env-password");
        ReflectionTestUtils.setField(service, "fallbackSmtpAuth", true);
        ReflectionTestUtils.setField(service, "fallbackStarttlsEnable", true);
    }

    @Test
    void getActiveSettings_readsDatabaseBeforeEnvFallback() {
        OtpMailSettings dbSettings = settings("db.smtp.test", 2525, "db-user@test.tn", "db-password");
        when(repository.findById(1L)).thenReturn(Optional.of(dbSettings));

        OtpMailSettingsService.ActiveOtpMailSettings active = service.getActiveSettings();

        assertEquals("db.smtp.test", active.host());
        assertEquals(2525, active.port());
        assertEquals("db-user@test.tn", active.username());
        assertEquals("db-password", active.password());
        assertEquals(OtpMailSecurityMode.STARTTLS, active.securityMode());
    }

    @Test
    void getActiveSettings_usesEnvFallbackWhenDatabaseIsEmpty() {
        when(repository.findById(1L)).thenReturn(Optional.empty());

        OtpMailSettingsService.ActiveOtpMailSettings active = service.getActiveSettings();

        assertEquals("env.smtp.test", active.host());
        assertEquals(587, active.port());
        assertEquals("env-user@test.tn", active.username());
        assertEquals("env-password", active.password());
    }

    @Test
    void updateSettings_preservesExistingEncryptedPasswordWhenPasswordIsBlank() {
        OtpMailSettings existing = settings("old.smtp.test", 587, "old-user@test.tn", "old-password");
        String encryptedBefore = existing.getPasswordEncrypted();
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(any(OtpMailSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateSettings(new OtpMailSettingsRequest(
                "new.smtp.test",
                465,
                "new-user@test.tn",
                "",
                true,
                OtpMailSecurityMode.SSL_TLS,
                "otp@test.tn"));

        ArgumentCaptor<OtpMailSettings> captor = ArgumentCaptor.forClass(OtpMailSettings.class);
        verify(repository).save(captor.capture());
        assertEquals("new.smtp.test", captor.getValue().getHost());
        assertEquals(OtpMailSecurityMode.SSL_TLS, captor.getValue().getSecurityMode());
        assertEquals(encryptedBefore, captor.getValue().getPasswordEncrypted());
        assertTrue(service.getSettings().passwordConfigured());
    }

    @Test
    void updateSettings_rejectsInvalidHostAndPort() {
        when(repository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> service.updateSettings(new OtpMailSettingsRequest(
                " ",
                587,
                "user@test.tn",
                "password",
                true,
                OtpMailSecurityMode.STARTTLS,
                null)));

        assertThrows(BadRequestException.class, () -> service.updateSettings(new OtpMailSettingsRequest(
                "smtp.test",
                0,
                "user@test.tn",
                "password",
                true,
                OtpMailSecurityMode.STARTTLS,
                null)));
    }

    private OtpMailSettings settings(String host, int port, String username, String password) {
        OtpMailSettings settings = new OtpMailSettings();
        settings.setId(1L);
        settings.setHost(host);
        settings.setPort(port);
        settings.setUsername(username);
        settings.setPasswordEncrypted(new AppConfigEncryptionService("12345678901234567890123456789012").encrypt(password));
        settings.setSmtpAuth(true);
        settings.setSecurityMode(OtpMailSecurityMode.STARTTLS);
        settings.setStarttlsEnable(true);
        settings.setFromAddress(username);
        return settings;
    }
}
