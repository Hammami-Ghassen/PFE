package com.sante.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class RequestOtpRequest {

    @NotBlank(message = "MAT_PERS est obligatoire")
    @Pattern(regexp = "\\d{8}", message = "MAT_PERS doit contenir exactement 8 chiffres")
    private String matPers;

    @NotNull(message = "Le canal OTP est obligatoire")
    private OtpChannel channel;
}
