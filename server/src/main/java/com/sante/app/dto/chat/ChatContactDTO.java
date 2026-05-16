package com.sante.app.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatContactDTO {
    private String matPers;
    private String name;
    private String codSoc;
    private String libSoc;
    private String role;
    private int unreadCount;
    private ChatMessageDTO lastMessage;
}
