package com.sante.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record CreateLeaveRequest(
        @NotNull(message = "La date de debut est obligatoire")
        LocalDate dateDebut,

        @NotNull(message = "La date de fin est obligatoire")
        LocalDate dateFin,

        @NotBlank(message = "Le code motif est obligatoire")
        @Size(max = 4, message = "Le code motif doit contenir au maximum 4 caracteres")
        String codeM,

        @Size(max = 1000, message = "Le commentaire ne doit pas depasser 1000 caracteres")
        String motifCng
) {
}
