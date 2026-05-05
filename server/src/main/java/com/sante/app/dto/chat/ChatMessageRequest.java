package com.sante.app.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageRequest {
    private String recipientId;
    private String content;
    private String type; // TEXT or FILE
    private Long attachmentId; // optional
}
