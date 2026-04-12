package com.sante.app.dto.response;

public record CorrectionAttachmentResponse(
        String fileName,
        byte[] content
) {
}
