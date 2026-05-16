package com.sante.app.dto.response;

import java.math.BigDecimal;

public record LeaveEntitlementResponse(
        String codeM,
        String libMot,
        String sexe,
        Boolean requiresAttachment,
        Integer maxDaysPerYear,
        Integer maxDaysPerCareer,
        Boolean deductsFromBalance,
        Boolean isHalfPay,
        BigDecimal usedDaysYear,
        BigDecimal usedDaysCareer,
        BigDecimal remainingDaysYear,
        BigDecimal remainingDaysCareer
) {
}
