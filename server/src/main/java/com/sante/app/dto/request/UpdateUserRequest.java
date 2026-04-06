package com.sante.app.dto.request;

import com.sante.app.model.enums.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UpdateUserRequest {

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
