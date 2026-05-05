package com.sante.app.dto.response;

import com.sante.app.model.NotificationType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationDto {
    private Long id;
    private String message;
    private NotificationType type;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
