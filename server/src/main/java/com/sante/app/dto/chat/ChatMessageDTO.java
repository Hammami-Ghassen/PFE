package com.sante.app.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDTO {
    private Long id;
    private String senderId;
    private String senderName;
    private String recipientId;
    private String roomId;
    private String content;
    private LocalDateTime timestamp;
    private String type;
    private ChatAttachmentDTO attachment;
}
