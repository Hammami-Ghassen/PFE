package com.sante.app.dto.response;

// Record-based response DTO removes builder/getter boilerplate while keeping payload shape unchanged.
public record PersonnelAdminResponse(
        String matPers,
        String codUser,
        String codSoc,
        String establishmentName,
        String email,
        String phone
) {
}
