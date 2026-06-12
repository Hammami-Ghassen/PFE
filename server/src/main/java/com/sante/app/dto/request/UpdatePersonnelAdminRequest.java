package com.sante.app.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdatePersonnelAdminRequest(
        @NotBlank(message = "COD_USER est obligatoire")
        String codUser,

        @Email(message = "L'adresse email est invalide")
        @Size(max = 255, message = "L'adresse email ne doit pas depasser 255 caracteres")
        String email,

        @Size(max = 255, message = "Le telephone ne doit pas depasser 255 caracteres")
        String phone
) {
}
