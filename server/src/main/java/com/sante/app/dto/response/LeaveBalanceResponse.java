package com.sante.app.dto.response;

import java.math.BigDecimal;

public record LeaveBalanceResponse(
        String codSoc,
        String matPers,
        Integer year,
        BigDecimal currentBalance
) {
}
