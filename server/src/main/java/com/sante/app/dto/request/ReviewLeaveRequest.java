package com.sante.app.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ReviewLeaveRequest(
        @NotBlank(message = "Le statut est obligatoire")
        String status
) {
}
