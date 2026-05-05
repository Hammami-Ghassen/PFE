package com.sante.app.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatAttachmentDTO {
    private Long id;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String url;
}
