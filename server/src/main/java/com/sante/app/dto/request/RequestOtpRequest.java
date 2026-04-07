package com.sante.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

// Record-based request DTO removes Lombok boilerplate without changing validation or JSON fields.
public record RequestOtpRequest(
        @NotBlank(message = "MAT_PERS est obligatoire")
        @Pattern(regexp = "\\d{8}", message = "MAT_PERS doit contenir exactement 8 chiffres")
        String matPers,
        @NotNull(message = "Le canal OTP est obligatoire")
        OtpChannel channel
) {
}
