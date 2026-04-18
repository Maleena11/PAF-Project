package com.smartcampus.service;

import com.smartcampus.model.Notification.NotificationType;
import com.smartcampus.model.NotificationPreference;
import com.smartcampus.model.User;
import com.smartcampus.repository.NotificationPreferenceRepository;
import com.smartcampus.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationPreferenceService {

    private final NotificationPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;

    /** Returns all 4 preferences for a user, creating defaults (all enabled) on first call. */
    public List<NotificationPreference> getPreferences(Long userId) {
        List<NotificationPreference> existing = preferenceRepository.findByUserId(userId);

        Map<NotificationType, NotificationPreference> byType = existing.stream()
                .collect(Collectors.toMap(NotificationPreference::getType, p -> p));

        User user = userRepository.getReferenceById(userId);

        List<NotificationPreference> result = Arrays.stream(NotificationType.values())
                .map(type -> byType.computeIfAbsent(type, t -> preferenceRepository.save(
                        NotificationPreference.builder().user(user).type(t).enabled(true).build())))
                .collect(Collectors.toList());

        return result;
    }

    /** Update a single preference. Returns the updated entity. */
    public NotificationPreference updatePreference(Long userId, NotificationType type, boolean enabled) {
        NotificationPreference pref = preferenceRepository.findByUserIdAndType(userId, type)
                .orElseGet(() -> {
                    User user = userRepository.getReferenceById(userId);
                    return NotificationPreference.builder().user(user).type(type).build();
                });
        pref.setEnabled(enabled);
        return preferenceRepository.save(pref);
    }

    /** Returns true if the user has the given notification type enabled (default: true if no record). */
    public boolean isEnabled(Long userId, NotificationType type) {
        return preferenceRepository.findByUserIdAndType(userId, type)
                .map(NotificationPreference::isEnabled)
                .orElse(true);
    }
}
