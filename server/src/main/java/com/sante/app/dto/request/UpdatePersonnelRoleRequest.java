package com.sante.app.dto.request;

import jakarta.validation.constraints.NotBlank;

// Record-based request DTO removes Lombok boilerplate without changing validation or JSON fields.
public record UpdatePersonnelRoleRequest(
        @NotBlank(message = "COD_USER est obligatoire")
        String codUser
) {
}
