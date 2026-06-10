package com.sante.app.dto.request;

import com.sante.app.model.auth.OtpMailSecurityMode;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record OtpMailSettingsRequest(
        @NotBlank(message = "Le serveur SMTP est obligatoire")
        String host,

        @NotNull(message = "Le port SMTP est obligatoire")
        @Min(value = 1, message = "Le port SMTP doit etre superieur a 0")
        Integer port,

        String username,
        String password,

        @NotNull(message = "L'authentification SMTP est obligatoire")
        Boolean smtpAuth,

        @NotNull(message = "Le type de securite SMTP est obligatoire")
        OtpMailSecurityMode securityMode,

        @Email(message = "L'adresse expediteur est invalide")
        String fromAddress
) {
}
