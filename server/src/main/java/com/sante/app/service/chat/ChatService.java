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
import com.sante.app.repository.SocieteRepository;
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
import com.sante.app.model.legacy.Societe;
import java.util.Map;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatAttachmentRepository chatAttachmentRepository;
    private final PersonnelRepository personnelRepository;
    private final SocieteRepository societeRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<ChatContactDTO> getContacts(String currentMatPers) {
        Personnel currentUser = personnelRepository.findById(currentMatPers)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
        String codSoc = currentUser.getCodSoc();
        String role = currentUser.getCodUser();

        List<ChatContactDTO> dtoList = new ArrayList<>();

        // Optimize by fetching societes mapped by codSoc upfront
        Map<String, String> societesMap = societeRepository.findAll().stream()
                .collect(Collectors.toMap(Societe::getCodSoc, Societe::getLibSoc, (a,b)->a));

        // 1. Etablissement Group Chat
        ChatMessage lastSocMsg = chatMessageRepository.findLastMessageByRoomId("ROOM_SOC_" + codSoc);
        dtoList.add(ChatContactDTO.builder()
                .matPers("ROOM_SOC_" + codSoc)
                .name("Discussion Établissement")
                .codSoc(codSoc)
                .libSoc(societesMap.getOrDefault(codSoc, codSoc))
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
                    .libSoc("N/A")
                    .role("GROUPE")
                    .unreadCount(0)
                    .lastMessage(lastDirMsg != null ? mapToDTO(lastDirMsg) : null)
                    .build());
        }

        // 3. Individual Contacts
        List<Personnel> individuals = new ArrayList<>();
        if ("DIRECTEUR".equals(role)) {
            individuals.addAll(personnelRepository.findContactsByCodSoc(codSoc, currentMatPers));
            if ("0001".equals(codSoc)) {
                individuals.addAll(personnelRepository.findAllDirectors(currentMatPers));
            }
        }
        
        // Everyone sees people they have already private messaged with
        List<String> messagedIds = Stream.concat(
                chatMessageRepository.findSendersToUser(currentMatPers).stream(),
                chatMessageRepository.findRecipientsFromUser(currentMatPers).stream()
        ).distinct().filter(id -> !id.equals(currentMatPers)).collect(Collectors.toList());
        
        if (!messagedIds.isEmpty()) {
            individuals.addAll(personnelRepository.findAllById(messagedIds));
        }

        // --- STRICT FILTERING (Removes legacy/cached contacts) ---
        // If current user is a non-ministere director, hide other non-ministere directors
        // outside of their own establishment.
        if ("DIRECTEUR".equals(role) && !"0001".equals(codSoc)) {
            individuals.removeIf(contact -> 
                "DIRECTEUR".equals(contact.getCodUser()) && 
                !codSoc.equals(contact.getCodSoc()) && 
                !"0001".equals(contact.getCodSoc())
            );
        }

        // Batch-load unread counts and last messages to avoid N+1
        Map<String, Long> unreadMap = chatMessageRepository.countUnreadMessagesGroupedBySender(currentMatPers)
                .stream().collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));
        Map<String, ChatMessage> lastMsgMap = chatMessageRepository.findLastMessagesForUser(currentMatPers)
                .stream().collect(Collectors.toMap(
                    msg -> msg.getSender().getMatPers().equals(currentMatPers)
                        ? msg.getRecipient().getMatPers()
                        : msg.getSender().getMatPers(),
                    msg -> msg,
                    (a, b) -> a.getTimestamp().isAfter(b.getTimestamp()) ? a : b
                ));

        dtoList.addAll(individuals.stream().distinct().map(contact -> {
            int unreadCount = unreadMap.getOrDefault(contact.getMatPers(), 0L).intValue();
            ChatMessage lastMessage = lastMsgMap.get(contact.getMatPers());

            return ChatContactDTO.builder()
                    .matPers(contact.getMatPers())
                    .name(contact.getPrenPers() + " " + contact.getNomPers())
                    .codSoc(contact.getCodSoc())
                    .libSoc(societesMap.getOrDefault(contact.getCodSoc(), contact.getCodSoc()))
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
            
            // Validation: Only Directeurs Ministere can send private messages to other Directeurs
            // Non-ministere directeurs can only talk to agents or reply to ministere directeurs
            if ("DIRECTEUR".equals(sender.getCodUser()) && "DIRECTEUR".equals(recipient.getCodUser()) 
                && !"0001".equals(sender.getCodSoc()) && !"0001".equals(recipient.getCodSoc())) {
                throw new RuntimeException("Seuls les directeurs du ministère peuvent envoyer des messages privés aux autres directeurs.");
            }
            
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
        if (senderId.startsWith("ROOM_")) return;
        chatMessageRepository.markAllAsRead(senderId, recipientId);
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
