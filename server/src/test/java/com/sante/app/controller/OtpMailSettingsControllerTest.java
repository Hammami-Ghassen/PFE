package com.sante.app.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sante.app.dto.request.OtpMailSettingsRequest;
import com.sante.app.dto.request.OtpMailTestRequest;
import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.OtpMailSettingsResponse;
import com.sante.app.model.auth.OtpMailSecurityMode;
import com.sante.app.service.OtpEmailService;
import com.sante.app.service.OtpMailSettingsService;
import java.lang.reflect.Method;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;

@ExtendWith(MockitoExtension.class)
class OtpMailSettingsControllerTest {

    @Mock
    private OtpMailSettingsService settingsService;

    @Mock
    private OtpEmailService otpEmailService;

    private OtpMailSettingsController controller;

    @BeforeEach
    void setUp() {
        controller = new OtpMailSettingsController(settingsService, otpEmailService);
    }

    @Test
    void controller_isAdminOnly() {
        PreAuthorize annotation = OtpMailSettingsController.class.getAnnotation(PreAuthorize.class);

        assertNotNull(annotation);
        assertEquals("hasRole('ADMIN')", annotation.value());
    }

    @Test
    void getSettings_returnsMaskedSettingsEnvelope() {
        OtpMailSettingsResponse dto = response();
        when(settingsService.getSettings()).thenReturn(dto);

        ResponseEntity<ApiResponse<OtpMailSettingsResponse>> response = controller.getSettings();

        assertEquals(200, response.getStatusCode().value());
        assertEquals(dto, response.getBody().data());
        assertEquals(true, response.getBody().data().passwordConfigured());
    }

    @Test
    void updateSettings_delegatesToService() {
        OtpMailSettingsRequest request = new OtpMailSettingsRequest(
                "smtp.example.tn",
                587,
                "smtp-user",
                "new-password",
                true,
                OtpMailSecurityMode.STARTTLS,
                "otp@example.tn");
        when(settingsService.updateSettings(request)).thenReturn(response());

        ResponseEntity<ApiResponse<OtpMailSettingsResponse>> response = controller.updateSettings(request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("Configuration SMTP mise a jour.", response.getBody().message());
        verify(settingsService).updateSettings(request);
    }

    @Test
    void sendTestEmail_usesActiveSettings() throws Exception {
        OtpMailTestRequest request = new OtpMailTestRequest(
                "admin@example.tn",
                "smtp.example.tn",
                587,
                "smtp-user",
                "smtp-password",
                true,
                OtpMailSecurityMode.STARTTLS,
                "otp@example.tn");

        ResponseEntity<ApiResponse<Void>> response = controller.sendTestEmail(request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("Connexion SMTP valide. Email de test envoye.", response.getBody().message());
        verify(otpEmailService).sendTestEmail(request);

        Method method = OtpMailSettingsController.class.getMethod("sendTestEmail", OtpMailTestRequest.class);
        assertNotNull(method);
    }

    private OtpMailSettingsResponse response() {
        return new OtpMailSettingsResponse(
                "smtp.example.tn",
                587,
                "smtp-user",
                true,
                true,
                OtpMailSecurityMode.STARTTLS,
                "otp@example.tn",
                "DATABASE",
                null);
    }
}
