package com.smartcampus.service;

import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.Notification;
import com.smartcampus.model.Notification.NotificationType;
import com.smartcampus.model.User;
import com.smartcampus.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceService notificationPreferenceService;

    public List<Notification> getNotificationsForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadNotificationsForUser(Long userId) {
        return notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    public Notification markAsRead(Long notificationId, Long requestingUserId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + notificationId));
        if (!notification.getUser().getId().equals(requestingUserId)) {
            throw new AccessDeniedException("You do not have permission to modify this notification");
        }
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification createNotification(User user, String title, String message,
                                            NotificationType type, Long referenceId) {
        try {
            if (!notificationPreferenceService.isEnabled(user.getId(), type)) {
                return null;
            }
            Notification notification = Notification.builder()
                    .user(user)
                    .title(title)
                    .message(message)
                    .type(type)
                    .referenceId(referenceId)
                    .read(false)
                    .build();
            return notificationRepository.save(notification);
        } catch (Exception e) {
            return null;
        }
    }

    public void deleteNotification(Long id, Long requestingUserId) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));
        if (!notification.getUser().getId().equals(requestingUserId)) {
            throw new AccessDeniedException("You do not have permission to delete this notification");
        }
        notificationRepository.delete(notification);
    }
}
