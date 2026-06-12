package com.sante.app.controller.chat;

import com.sante.app.dto.chat.ChatContactDTO;
import com.sante.app.dto.chat.ChatMessageDTO;
import com.sante.app.dto.chat.ChatMessageRequest;
import com.sante.app.dto.response.ApiResponse;
import com.sante.app.service.chat.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('AGENT','DIRECTEUR')")
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping("/contacts")
    public ApiResponse<List<ChatContactDTO>> getContacts(Authentication authentication) {
        String currentMatPers = authentication.getName(); // JWT subject
        List<ChatContactDTO> contacts = chatService.getContacts(currentMatPers);
        return ApiResponse.success("Contacts retrieved successfully", contacts);
    }

    @GetMapping("/messages/{otherMatPers}")
    public ApiResponse<List<ChatMessageDTO>> getChatHistory(@PathVariable String otherMatPers, Authentication authentication) {
        String currentMatPers = authentication.getName();
        List<ChatMessageDTO> history = chatService.getChatHistory(currentMatPers, otherMatPers);
        return ApiResponse.success("Chat history retrieved successfully", history);
    }

    @PostMapping("/messages/{otherMatPers}/read")
    public ApiResponse<Void> markAsRead(@PathVariable String otherMatPers, Authentication authentication) {
        String currentMatPers = authentication.getName();
        chatService.markMessagesAsRead(currentMatPers, otherMatPers);
        return ApiResponse.success("Messages marked as read", null);
    }

    @MessageMapping("/chat")
    public void processMessage(@Payload ChatMessageRequest chatMessage, Principal principal) {
        String senderId = principal.getName();
        ChatMessageDTO savedMsg = chatService.processAndSaveMessage(senderId, chatMessage);

        List<String> recipients = chatService.getTargetRecipients(savedMsg);
        for(String recipientId : recipients) {
            messagingTemplate.convertAndSendToUser(
                    recipientId, "/queue/messages",
                    savedMsg
            );
        }
    }
}
