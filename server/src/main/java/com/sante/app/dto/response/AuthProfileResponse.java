package com.sante.app.dto.response;

// Record-based response DTO removes builder/getter boilerplate while keeping payload shape unchanged.
public record AuthProfileResponse(
        String matPers,
        String firstName,
        String lastName,
        String fullName,
        String role,
        String codSoc,
        String establishmentName,
        String email,
        String phone,
        String adresse,
        String service,
        String grade,
        String posteTravail
) {
}
