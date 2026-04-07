package com.sante.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class VerifyOtpRequest {

    @NotBlank(message = "MAT_PERS est obligatoire")
    @Pattern(regexp = "\\d{8}", message = "MAT_PERS doit contenir exactement 8 chiffres")
    private String matPers;

    @NotBlank(message = "OTP est obligatoire")
    @Pattern(regexp = "\\d{6}", message = "OTP doit contenir exactement 6 chiffres")
    private String otp;
}
