package com.sante.app.controller;

import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.NotificationDto;
import org.springframework.security.core.Authentication;
import com.sante.app.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getMyNotifications(
            Authentication authentication) {
        String matPers = (String) authentication.getPrincipal();
        List<NotificationDto> notifications = notificationService.getUserNotifications(matPers);
        return ResponseEntity.ok(ApiResponse.success(notifications));
    }

    @GetMapping("/my/unread-count")
    public ResponseEntity<ApiResponse<Long>> getMyUnreadCount(
            Authentication authentication) {
        String matPers = (String) authentication.getPrincipal();
        long count = notificationService.getUnreadCount(matPers);
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationDto>> markAsRead(
            @PathVariable Long id,
            Authentication authentication) {
        String matPers = (String) authentication.getPrincipal();
        NotificationDto notification = notificationService.markAsRead(id, matPers);
        return ResponseEntity.ok(ApiResponse.success("Notification marquée comme lue", notification));
    }
}
