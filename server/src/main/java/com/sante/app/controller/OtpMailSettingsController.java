package com.sante.app.controller;

import com.sante.app.dto.request.OtpMailSettingsRequest;
import com.sante.app.dto.request.OtpMailTestRequest;
import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.OtpMailSettingsResponse;
import com.sante.app.service.OtpEmailService;
import com.sante.app.service.OtpMailSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/otp-mail-settings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Administration OTP SMTP", description = "Configuration SMTP utilisee par l'envoi OTP")
public class OtpMailSettingsController {

    private final OtpMailSettingsService settingsService;
    private final OtpEmailService otpEmailService;

    @GetMapping
    @Operation(summary = "Lire la configuration SMTP OTP active")
    public ResponseEntity<ApiResponse<OtpMailSettingsResponse>> getSettings() {
        return ResponseEntity.ok(ApiResponse.success(settingsService.getSettings()));
    }

    @PutMapping
    @Operation(summary = "Mettre a jour la configuration SMTP OTP")
    public ResponseEntity<ApiResponse<OtpMailSettingsResponse>> updateSettings(
            @Valid @RequestBody OtpMailSettingsRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Configuration SMTP mise a jour.", settingsService.updateSettings(request)));
    }

    @PostMapping("/test")
    @Operation(summary = "Tester une configuration SMTP sans la sauvegarder")
    public ResponseEntity<ApiResponse<Void>> sendTestEmail(@Valid @RequestBody OtpMailTestRequest request) {
        try {
            otpEmailService.sendTestEmail(request);
            return ResponseEntity.ok(ApiResponse.success("Connexion SMTP valide. Email de test envoye.", null));
        } catch (MailException | IllegalStateException ex) {
            return ResponseEntity
                    .status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error(rawErrorMessage(ex)));
        }
    }

    private String rawErrorMessage(Exception ex) {
        Throwable root = ex;
        while (root.getCause() != null) {
            root = root.getCause();
        }
        return root.getMessage() != null ? root.getMessage() : ex.getMessage();
    }
}
