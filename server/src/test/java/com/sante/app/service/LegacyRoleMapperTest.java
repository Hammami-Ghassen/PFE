package com.sante.app.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.sante.app.exception.BadRequestException;
import org.junit.jupiter.api.Test;

class LegacyRoleMapperTest {

    private final LegacyRoleMapper mapper = new LegacyRoleMapper();

    @Test
    void toAppRole_keepsLegacyMappingsUnchanged() {
        assertEquals("ADMIN", mapper.toAppRole("ADMIN"));
        assertEquals("DIRECTEUR", mapper.toAppRole("DIRECTEUR"));
        assertEquals("EMPLOYEE", mapper.toAppRole("AGENT"));
    }

    @Test
    void toAppRole_defaultsUnknownValuesToEmployee() {
        assertEquals("EMPLOYEE", mapper.toAppRole("UNKNOWN"));
        assertEquals("EMPLOYEE", mapper.toAppRole(null));
    }

    @Test
    void validateCodUser_rejectsUnsupportedRoles() {
        assertThrows(BadRequestException.class, () -> mapper.validateCodUser("INVALID"));
    }
}
