package com.sante.app.dto.response;

// Record-based response DTO removes builder/getter boilerplate while keeping payload shape unchanged.
public record EstablishmentResponse(String codSoc, String libSoc) {
}
