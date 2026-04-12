package com.sante.app.dto.response;

import java.time.LocalDateTime;

public record CorrectionRequestResponse(
        Long id,
        String matPers,
        String attributCible,
        String ancienneValeur,
        String nouvelleValeur,
        String statut,
        LocalDateTime dateDemande
) {
}
