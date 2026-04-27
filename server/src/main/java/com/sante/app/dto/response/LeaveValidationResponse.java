package com.sante.app.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LeaveValidationResponse(
        String codSoc,
        String matPers,
        Integer numDcng,
        String fullName,
        String demandeurRole,
        LocalDate dateDemande,
        LocalDate dateDebut,
        LocalDate dateFin,
        String codeM,
        String libMot,
        BigDecimal nbrJours,
        String requestComment,
        String statusCode,
        String statusLabel,
        String rejectionComment
) {
}
