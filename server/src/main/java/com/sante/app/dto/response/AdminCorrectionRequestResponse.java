package com.sante.app.dto.response;

import java.time.LocalDateTime;

public record AdminCorrectionRequestResponse(
        Long id,
        String matPers,
        String fullName,
        String attributCible,
        String ancienneValeur,
        String nouvelleValeur,
        String statut,
        LocalDateTime dateDemande,
        boolean hasAttachment
) {
}
