package com.sante.app.dto.request;

import com.sante.app.model.enums.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateUserRequest {

    @NotBlank(message = "Le CIN est obligatoire")
    @Pattern(regexp = "\\d{8}", message = "Le CIN doit contenir exactement 8 chiffres")
    private String cin;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 100)
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire")
    @Size(max = 100)
    private String prenom;

    @Email(message = "L'email n'est pas valide")
    @Size(max = 150)
    private String email;

    @NotNull(message = "Le rôle est obligatoire")
    private Role role;
}
