package com.sante.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewLeaveRequest(
        @NotBlank(message = "Le statut est obligatoire")
        String status,

        @Size(max = 1000, message = "Le commentaire ne doit pas depasser 1000 caracteres")
        String comment
) {
}
