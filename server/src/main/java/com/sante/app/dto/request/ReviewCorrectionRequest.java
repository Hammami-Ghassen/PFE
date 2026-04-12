package com.sante.app.dto.request;

import com.sante.app.model.correction.CorrectionRequestStatus;
import jakarta.validation.constraints.NotNull;

public record ReviewCorrectionRequest(
        @NotNull(message = "Le statut est obligatoire")
        CorrectionRequestStatus status
) {
}
