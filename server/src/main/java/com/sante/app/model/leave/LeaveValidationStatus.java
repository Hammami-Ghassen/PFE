package com.sante.app.model.leave;

import java.util.Locale;

public enum LeaveValidationStatus {
    PENDING("I", "En attente"),
    APPROVED("O", "Acceptee"),
    REJECTED("N", "Refusee");

    private final String code;
    private final String label;

    LeaveValidationStatus(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public String getCode() {
        return code;
    }

    public String getLabel() {
        return label;
    }

    public static LeaveValidationStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Le statut est obligatoire.");
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);
        for (LeaveValidationStatus status : values()) {
            if (status.code.equals(normalized) || status.name().equals(normalized)) {
                return status;
            }
        }

        throw new IllegalArgumentException("Statut invalide.");
    }
}
