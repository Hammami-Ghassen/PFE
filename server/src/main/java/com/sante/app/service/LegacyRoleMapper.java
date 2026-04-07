package com.sante.app.service;

import com.sante.app.exception.BadRequestException;
import org.springframework.stereotype.Component;

@Component
public class LegacyRoleMapper {

    public String normalizeCodUser(String codUser) {
        return codUser == null ? "" : codUser.trim().toUpperCase();
    }

    public String toAppRole(String codUser) {
        String normalized = normalizeCodUser(codUser);
        return switch (normalized) {
            case "ADMIN" -> "ADMIN";
            case "DIRECTEUR" -> "DIRECTEUR";
            case "AGENT" -> "EMPLOYEE";
            default -> "EMPLOYEE";
        };
    }

    public String toAuthority(String codUser) {
        return "ROLE_" + toAppRole(codUser);
    }

    public boolean isAdminCodUser(String codUser) {
        return "ADMIN".equals(normalizeCodUser(codUser));
    }

    public void validateCodUser(String codUser) {
        String normalized = normalizeCodUser(codUser);
        if (!("ADMIN".equals(normalized) || "DIRECTEUR".equals(normalized) || "AGENT".equals(normalized))) {
            throw new BadRequestException("COD_USER invalide. Valeurs autorisées: ADMIN, DIRECTEUR, AGENT.");
        }
    }
}
