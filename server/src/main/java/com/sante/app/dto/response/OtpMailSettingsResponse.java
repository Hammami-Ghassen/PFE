package com.sante.app.dto.response;

import com.sante.app.model.auth.OtpMailSecurityMode;
import java.time.LocalDateTime;

public record OtpMailSettingsResponse(
        String host,
        Integer port,
        String username,
        boolean passwordConfigured,
        Boolean smtpAuth,
        OtpMailSecurityMode securityMode,
        String fromAddress,
        String source,
        LocalDateTime updatedAt
) {
}
