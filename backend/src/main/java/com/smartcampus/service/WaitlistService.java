package com.smartcampus.service;

import com.smartcampus.dto.WaitlistRequestDTO;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.*;
import com.smartcampus.model.Booking.BookingStatus;
import com.smartcampus.model.Booking.RecurrenceRule;
import com.smartcampus.model.WaitlistEntry.WaitlistStatus;
import com.smartcampus.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class WaitlistService {

    private final WaitlistRepository  waitlistRepository;
    private final BookingRepository   bookingRepository;
    private final ResourceRepository  resourceRepository;
    private final UserRepository      userRepository;
    private final NotificationService notificationService;

    public WaitlistEntry joinWaitlist(WaitlistRequestDTO dto) {
        if (!dto.getSlotEnd().isAfter(dto.getSlotStart())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        Resource resource = resourceRepository.findById(dto.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + dto.getResourceId()));

        User user = getCurrentUser();

        if (waitlistRepository.existsWaitingEntry(
                dto.getResourceId(), user.getId(), dto.getSlotStart(), dto.getSlotEnd())) {
            throw new IllegalStateException("You are already on the waitlist for this slot");
        }

        WaitlistEntry entry = WaitlistEntry.builder()
                .resource(resource)
                .user(user)
                .slotStart(dto.getSlotStart())
                .slotEnd(dto.getSlotEnd())
                .title(dto.getTitle())
                .purpose(dto.getPurpose())
                .expectedAttendees(dto.getExpectedAttendees())
                .notes(dto.getNotes())
                .status(WaitlistStatus.WAITING)
                .build();

        WaitlistEntry saved = waitlistRepository.save(entry);

        notificationService.createNotification(
                user,
                "Added to Waitlist",
                "You've joined the waitlist for '" + resource.getName() + "' on "
                + dto.getSlotStart().toLocalDate()
                + " (" + fmt(dto.getSlotStart()) + " – " + fmt(dto.getSlotEnd()) + ")."
                + " If a slot opens up, we'll create a pending booking for you and notify you.",
                Notification.NotificationType.BOOKING,
                saved.getId());

        return saved;
    }

    public List<WaitlistEntry> getCurrentUserWaitlist() {
        return waitlistRepository.findByUserIdOrderByCreatedAtDesc(getCurrentUser().getId());
    }

    public List<WaitlistEntry> getAccessibleWaitlistByUser(Long userId) {
        User currentUser = getCurrentUser();
        if (!isAdmin(currentUser) && !currentUser.getId().equals(userId)) {
            throw new AccessDeniedException("Students can only view their own waitlist entries");
        }
        return waitlistRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public void leaveWaitlist(Long entryId) {
        WaitlistEntry entry = waitlistRepository.findById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("Waitlist entry not found: " + entryId));

        if (!entry.getUser().getId().equals(getCurrentUser().getId())) {
            throw new AccessDeniedException("You can only remove your own waitlist entries");
        }
        if (entry.getStatus() != WaitlistStatus.WAITING) {
            throw new IllegalStateException("Entry is no longer active");
        }

        entry.setStatus(WaitlistStatus.CANCELLED);
        waitlistRepository.save(entry);
    }

    public void leaveWaitlist(Long entryId, Long userId) {
        WaitlistEntry entry = waitlistRepository.findById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("Waitlist entry not found: " + entryId));

        User currentUser = getCurrentUser();
        boolean isOwner = entry.getUser().getId().equals(currentUser.getId());
        boolean matchesRequestedUser = userId != null && entry.getUser().getId().equals(userId);

        if (!isOwner || !matchesRequestedUser) {
            throw new AccessDeniedException("You can only remove your own waitlist entries");
        }
        if (entry.getStatus() != WaitlistStatus.WAITING) {
            throw new IllegalStateException("Entry is no longer active");
        }

        entry.setStatus(WaitlistStatus.CANCELLED);
        waitlistRepository.save(entry);
    }

    public long getWaitlistCount(Long resourceId, LocalDateTime slotStart, LocalDateTime slotEnd) {
        return waitlistRepository.countWaiting(resourceId, slotStart, slotEnd);
    }

    /** Admin: all entries, optionally filtered by resourceId and/or status string. */
    public List<WaitlistEntry> getAllWaitlist(Long resourceId, String status) {
        WaitlistStatus parsedStatus = null;
        if (status != null && !status.isBlank()) {
            try { parsedStatus = WaitlistStatus.valueOf(status.toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }
        return waitlistRepository.findAllWithFilters(resourceId, parsedStatus);
    }

    /** Admin: forcibly remove any waitlist entry regardless of owner. */
    public void adminRemove(Long entryId) {
        WaitlistEntry entry = waitlistRepository.findById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("Waitlist entry not found: " + entryId));
        if (entry.getStatus() != WaitlistStatus.WAITING) {
            throw new IllegalStateException("Entry is no longer active");
        }
        entry.setStatus(WaitlistStatus.CANCELLED);
        waitlistRepository.save(entry);
    }

    /** Queue position (1-based) of a WAITING entry among entries for the same resource+slot. */
    public long getQueuePosition(WaitlistEntry entry) {
        return 1 + waitlistRepository.countAhead(
                entry.getResource().getId(),
                entry.getSlotStart(),
                entry.getSlotEnd(),
                entry.getCreatedAt());
    }

    /**
     * Called when a booking is cancelled. Promotes the first eligible waitlisted user
     * by creating a PENDING booking for them and sending a notification.
     */
    public void promoteFromWaitlist(Booking cancelledBooking) {
        List<WaitlistEntry> eligible = waitlistRepository.findEligibleForPromotion(
                cancelledBooking.getResource().getId(),
                cancelledBooking.getStartTime(),
                cancelledBooking.getEndTime());

        for (WaitlistEntry entry : eligible) {
            // Verify the specific requested slot is actually free now
            boolean slotFree = bookingRepository.isResourceAvailable(
                    entry.getResource().getId(),
                    entry.getSlotStart(),
                    entry.getSlotEnd(),
                    null);

            if (!slotFree) continue;

            // Create a PENDING booking — admin must approve
            Booking promoted = Booking.builder()
                    .resource(entry.getResource())
                    .user(entry.getUser())
                    .title(entry.getTitle())
                    .purpose(entry.getPurpose())
                    .expectedAttendees(entry.getExpectedAttendees())
                    .startTime(entry.getSlotStart())
                    .endTime(entry.getSlotEnd())
                    .notes(entry.getNotes())
                    .status(BookingStatus.PENDING)
                    .recurrenceRule(RecurrenceRule.NONE)
                    .build();

            Booking savedBooking = bookingRepository.save(promoted);

            entry.setStatus(WaitlistStatus.PROMOTED);
            waitlistRepository.save(entry);

            // Notify the waitlisted user
            notificationService.createNotification(
                    entry.getUser(),
                    "Waitlist: Slot Available",
                    "A slot opened up for '" + entry.getResource().getName() + "' on "
                    + entry.getSlotStart().toLocalDate()
                    + " (" + fmt(entry.getSlotStart()) + " – " + fmt(entry.getSlotEnd()) + ")."
                    + " Your booking is now pending admin approval.",
                    Notification.NotificationType.BOOKING,
                    savedBooking.getId());

            // Notify all admins to review the promoted booking
            userRepository.findByRole(User.Role.ADMIN).forEach(admin ->
                notificationService.createNotification(
                    admin,
                    "Waitlist Booking Needs Approval",
                    "A waitlisted booking for '" + entry.getResource().getName() + "' on "
                    + entry.getSlotStart().toLocalDate()
                    + " (" + fmt(entry.getSlotStart()) + " – " + fmt(entry.getSlotEnd()) + ")"
                    + " is pending your approval (user: " + entry.getUser().getName() + ").",
                    Notification.NotificationType.BOOKING,
                    savedBooking.getId())
            );

            return; // only promote one person per cancellation event
        }
    }

    private static String fmt(LocalDateTime dt) {
        return String.format("%02d:%02d", dt.getHour(), dt.getMinute());
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new AccessDeniedException("Authentication is required");
        }

        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("Authenticated user was not found"));
    }

    private boolean isAdmin(User user) {
        return user.getRole() == User.Role.ADMIN;
    }
}
