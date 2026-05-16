package com.sante.app.dto.response;

public record LeaveMotifResponse(
        String codeM,
        String libMot,
        String typCng,
        String sexe,
        Boolean requiresAttachment,
        Integer maxDaysPerYear,
        Integer maxDaysPerCareer,
        Boolean deductsFromBalance,
        Boolean isHalfPay
) {
}
