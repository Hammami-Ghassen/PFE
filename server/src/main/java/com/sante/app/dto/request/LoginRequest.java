package com.sante.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank(message = "Le CIN est obligatoire")
    @Pattern(regexp = "\\d{8}", message = "Le CIN doit contenir exactement 8 chiffres")
    private String cin;

    @NotBlank(message = "Le mot de passe est obligatoire")
    private String password;
}
