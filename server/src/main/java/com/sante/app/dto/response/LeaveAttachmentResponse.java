package com.sante.app.dto.response;

public record LeaveAttachmentResponse(
        String fileName,
        String fileType,
        byte[] content
) {
}
