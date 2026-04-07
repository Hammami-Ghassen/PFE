package com.sante.app.dto.response;

// Record-based response DTO removes builder/getter boilerplate while keeping payload shape unchanged.
public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        Long expiresIn,
        String matPers,
        String role
) {
}
