package com.sante.app.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LeaveRequestResponse(
        String codSoc,
        String matPers,
        Integer numDcng,
        LocalDate dateDemande,
        LocalDate dateDebut,
        LocalDate dateFin,
        String codeM,
        String libMot,
        BigDecimal nbrJours,
        String statusCode,
        String statusLabel,
        String rejectionComment
) {
}
