package com.sante.app.service.chat;

import com.sante.app.dto.chat.ChatContactDTO;
import com.sante.app.dto.chat.ChatMessageDTO;
import com.sante.app.dto.chat.ChatMessageRequest;
import com.sante.app.model.chat.ChatAttachment;
import com.sante.app.model.chat.ChatMessage;
import com.sante.app.model.legacy.Personnel;
import com.sante.app.repository.PersonnelRepository;
import com.sante.app.repository.chat.ChatAttachmentRepository;
import com.sante.app.repository.chat.ChatMessageRepository;
import com.sante.app.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.sante.app.model.NotificationType;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatAttachmentRepository chatAttachmentRepository;
    private final PersonnelRepository personnelRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<ChatContactDTO> getContacts(String currentMatPers) {
        Personnel currentUser = personnelRepository.findById(currentMatPers)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
        String codSoc = currentUser.getCodSoc();
        String role = currentUser.getCodUser();

        List<ChatContactDTO> dtoList = new ArrayList<>();

        // 1. Etablissement Group Chat
        ChatMessage lastSocMsg = chatMessageRepository.findLastMessageByRoomId("ROOM_SOC_" + codSoc);
        dtoList.add(ChatContactDTO.builder()
                .matPers("ROOM_SOC_" + codSoc)
                .name("Discussion Établissement")
                .codSoc(codSoc)
                .role("GROUPE")
                .unreadCount(0) // Simplified for groups for now
                .lastMessage(lastSocMsg != null ? mapToDTO(lastSocMsg) : null)
                .build());

        // 2. Directeurs Group Chat
        if ("DIRECTEUR".equals(role)) {
            ChatMessage lastDirMsg = chatMessageRepository.findLastMessageByRoomId("ROOM_DIR");
            dtoList.add(ChatContactDTO.builder()
                    .matPers("ROOM_DIR")
                    .name("Discussion Directeurs")
                    .codSoc("ALL")
                    .role("GROUPE")
                    .unreadCount(0)
                    .lastMessage(lastDirMsg != null ? mapToDTO(lastDirMsg) : null)
                    .build());
        }

        // 3. Individual Contacts
        List<Personnel> individuals = new ArrayList<>();
        if ("DIRECTEUR".equals(role)) {
            individuals.addAll(personnelRepository.findContactsByCodSoc(codSoc, currentMatPers));
            individuals.addAll(personnelRepository.findAllDirectors(currentMatPers));
        } else {
            // Agent sees only people they have private messaged with
            List<String> messagedIds = Stream.concat(
                    chatMessageRepository.findSendersToUser(currentMatPers).stream(),
                    chatMessageRepository.findRecipientsFromUser(currentMatPers).stream()
            ).distinct().filter(id -> !id.equals(currentMatPers)).collect(Collectors.toList());
            if (!messagedIds.isEmpty()) {
                individuals.addAll(personnelRepository.findAllById(messagedIds));
            }
        }

        // Map individuals and add to list
        dtoList.addAll(individuals.stream().distinct().map(contact -> {
            int unreadCount = chatMessageRepository.countUnreadMessages(currentMatPers, contact.getMatPers());
            ChatMessage lastMessage = chatMessageRepository.findLastMessage(currentMatPers, contact.getMatPers());

            return ChatContactDTO.builder()
                    .matPers(contact.getMatPers())
                    .name(contact.getPrenPers() + " " + contact.getNomPers())
                    .codSoc(contact.getCodSoc())
                    .role(contact.getCodUser())
                    .unreadCount(unreadCount)
                    .lastMessage(lastMessage != null ? mapToDTO(lastMessage) : null)
                    .build();
        }).collect(Collectors.toList()));

        return dtoList;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDTO> getChatHistory(String currentMatPers, String otherId) {
        if (otherId.startsWith("ROOM_")) {
            return chatMessageRepository.findChatHistoryByRoomId(otherId)
                    .stream()
                    .map(this::mapToDTO)
                    .collect(Collectors.toList());
        }
        return chatMessageRepository.findChatHistory(currentMatPers, otherId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ChatMessageDTO processAndSaveMessage(String senderId, ChatMessageRequest request) {
        Personnel sender = personnelRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        ChatMessage.ChatMessageBuilder builder = ChatMessage.builder()
                .sender(sender)
                .content(request.getContent())
                .type(ChatMessage.MessageType.valueOf(request.getType()));

        String recipientStr = request.getRecipientId();
        if (recipientStr != null && recipientStr.startsWith("ROOM_")) {
            builder.roomId(recipientStr);
            builder.recipient(null);
        } else {
            Personnel recipient = personnelRepository.findById(recipientStr)
                    .orElseThrow(() -> new RuntimeException("Recipient not found"));
            builder.roomId(null);
            builder.recipient(recipient);
        }

        ChatMessage message = builder.build();

        if (request.getAttachmentId() != null) {
            ChatAttachment attachment = chatAttachmentRepository.findById(request.getAttachmentId())
                    .orElseThrow(() -> new RuntimeException("Attachment not found"));
            attachment.setMessage(message);
            message.setAttachment(attachment);
        }

        message = chatMessageRepository.save(message);

        // Notifications
        if (message.getRecipient() != null) {
            Personnel recipient = message.getRecipient();
            if ("DIRECTEUR".equals(sender.getCodUser()) && !"DIRECTEUR".equals(recipient.getCodUser())) {
                notificationService.createNotification(recipient.getMatPers(), "Nouveau message de votre responsable.", NotificationType.MESSAGE);
            } else if ("0001".equals(sender.getCodSoc()) && "DIRECTEUR".equals(sender.getCodUser()) && "DIRECTEUR".equals(recipient.getCodUser())) {
                notificationService.createNotification(recipient.getMatPers(), "Nouveau message du Ministère.", NotificationType.MESSAGE);
            }
        } else if (message.getRoomId() != null) {
            if ("DIRECTEUR".equals(sender.getCodUser())) {
                if (message.getRoomId().startsWith("ROOM_SOC_")) {
                    String codSoc = message.getRoomId().substring(9);
                    if (codSoc.equals(sender.getCodSoc())) {
                        List<String> targets = personnelRepository.findMatPersByCodSoc(codSoc);
                        for (String matPers : targets) {
                            if (!matPers.equals(sender.getMatPers())) {
                                notificationService.createNotification(matPers, "Nouveau message de votre responsable dans le groupe.", NotificationType.MESSAGE);
                            }
                        }
                    }
                } else if (message.getRoomId().equals("ROOM_DIR") && "0001".equals(sender.getCodSoc())) {
                    List<String> targets = personnelRepository.findMatPersByRole("DIRECTEUR");
                    for (String matPers : targets) {
                        if (!matPers.equals(sender.getMatPers())) {
                            notificationService.createNotification(matPers, "Nouveau message du Ministère dans le groupe.", NotificationType.MESSAGE);
                        }
                    }
                }
            }
        }

        return mapToDTO(message);
    }
    
    @Transactional(readOnly = true)
    public List<String> getTargetRecipients(ChatMessageDTO msg) {
        if (msg.getRoomId() != null) {
            if (msg.getRoomId().startsWith("ROOM_SOC_")) {
                String codSoc = msg.getRoomId().substring(9);
                return personnelRepository.findMatPersByCodSoc(codSoc);
            } else if (msg.getRoomId().equals("ROOM_DIR")) {
                return personnelRepository.findMatPersByRole("DIRECTEUR");
            }
        }
        return Collections.singletonList(msg.getRecipientId());
    }

    @Transactional
    public void markMessagesAsRead(String recipientId, String senderId) {
        if (senderId.startsWith("ROOM_")) return; // Skip mark as read for rooms for now
        List<ChatMessage> messages = chatMessageRepository.findChatHistory(senderId, recipientId);
        for (ChatMessage msg : messages) {
            if (msg.getRecipient() != null && msg.getRecipient().getMatPers().equals(recipientId) && !msg.isRead()) {
                msg.setRead(true);
            }
        }
        chatMessageRepository.saveAll(messages);
    }

    private ChatMessageDTO mapToDTO(ChatMessage message) {
        return ChatMessageDTO.builder()
                .id(message.getId())
                .senderId(message.getSender().getMatPers())
                .senderName(message.getSender().getPrenPers() + " " + message.getSender().getNomPers())
                .recipientId(message.getRecipient() != null ? message.getRecipient().getMatPers() : null)
                .roomId(message.getRoomId())
                .content(message.getContent())
                .timestamp(message.getTimestamp())
                .type(message.getType().name())
                .attachment(message.getAttachment() != null ? com.sante.app.dto.chat.ChatAttachmentDTO.builder()
                        .id(message.getAttachment().getId())
                        .fileName(message.getAttachment().getFileName())
                        .fileType(message.getAttachment().getFileType())
                        .fileSize(message.getAttachment().getFileSize())
                        .url("/api/chat/files/" + message.getAttachment().getId())
                        .build() : null)
                .build();
    }
}
