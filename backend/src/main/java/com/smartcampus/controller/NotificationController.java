package com.smartcampus.controller;

import com.smartcampus.model.Notification;
import com.smartcampus.model.Notification.NotificationType;
import com.smartcampus.model.NotificationPreference;
import com.smartcampus.service.NotificationPreferenceService;
import com.smartcampus.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationPreferenceService preferenceService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Notification>> getNotifications(@PathVariable Long userId) {
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId));
    }

    @GetMapping("/user/{userId}/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(@PathVariable Long userId) {
        return ResponseEntity.ok(notificationService.getUnreadNotificationsForUser(userId));
    }

    @GetMapping("/user/{userId}/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable Long userId) {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(userId)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(
            @PathVariable Long id,
            @RequestParam Long userId) {
        return ResponseEntity.ok(notificationService.markAsRead(id, userId));
    }

    @PatchMapping("/user/{userId}/read-all")
    public ResponseEntity<Void> markAllAsRead(@PathVariable Long userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(
            @PathVariable Long id,
            @RequestParam Long userId) {
        notificationService.deleteNotification(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/preferences/{userId}")
    public ResponseEntity<List<NotificationPreference>> getPreferences(@PathVariable Long userId) {
        return ResponseEntity.ok(preferenceService.getPreferences(userId));
    }

    @PutMapping("/preferences/{userId}/{type}")
    public ResponseEntity<NotificationPreference> updatePreference(
            @PathVariable Long userId,
            @PathVariable NotificationType type,
            @RequestBody Map<String, Boolean> body) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        return ResponseEntity.ok(preferenceService.updatePreference(userId, type, enabled));
    }
}
