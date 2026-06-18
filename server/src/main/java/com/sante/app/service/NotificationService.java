package com.sante.app.service;

import com.sante.app.dto.response.NotificationDto;
import com.sante.app.model.NotificationType;
import com.sante.app.model.notification.AppNotification;
import com.sante.app.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {
    
    private final NotificationRepository notificationRepository;

    @Transactional
    public void createNotification(String matPers, String message, NotificationType type) {
        AppNotification notification = AppNotification.builder()
                .matPers(matPers)
                .message(message)
                .type(type)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
        log.info("Created notification for user {}: {}", matPers, message);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createNotificationInNewTransaction(String matPers, String message, NotificationType type) {
        createNotification(matPers, message, type);
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getUserNotifications(String matPers) {
        return notificationRepository.findByMatPersOrderByCreatedAtDesc(matPers)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String matPers) {
        return notificationRepository.countByMatPersAndIsReadFalse(matPers);
    }

    @Transactional
    public NotificationDto markAsRead(Long id, String matPers) {
        AppNotification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
                
        // Ensure the notification belongs to the user
        if (!notification.getMatPers().equals(matPers)) {
            throw new RuntimeException("Unauthorized to read this notification");
        }
        
        notification.setIsRead(true);
        notification = notificationRepository.save(notification);
        return mapToDto(notification);
    }

    public void notifyResponsableOnNewMessage(String responsableMatPers) {
        // This is a placeholder for future implementation
        createNotification(
                responsableMatPers, 
                "Vous avez reçu un nouveau message du directeur.", 
                NotificationType.MESSAGE
        );
    }

    private NotificationDto mapToDto(AppNotification notification) {
        return NotificationDto.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .type(notification.getType())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
