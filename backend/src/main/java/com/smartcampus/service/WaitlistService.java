package com.smartcampus.service;

import com.smartcampus.dto.WaitlistRequestDTO;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.*;
import com.smartcampus.model.Booking.BookingStatus;
import com.smartcampus.model.Booking.RecurrenceRule;
import com.smartcampus.model.WaitlistEntry.WaitlistStatus;
import com.smartcampus.repository.*;
import lombok.RequiredArgsConstructor;
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

        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + dto.getUserId()));

        if (waitlistRepository.existsWaitingEntry(
                dto.getResourceId(), dto.getUserId(), dto.getSlotStart(), dto.getSlotEnd())) {
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
                + " You'll be notified automatically if a slot opens up.",
                Notification.NotificationType.BOOKING,
                saved.getId());

        return saved;
    }

    public List<WaitlistEntry> getUserWaitlist(Long userId) {
        return waitlistRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public void leaveWaitlist(Long entryId, Long requestingUserId) {
        WaitlistEntry entry = waitlistRepository.findById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("Waitlist entry not found: " + entryId));

        if (!entry.getUser().getId().equals(requestingUserId)) {
            throw new IllegalArgumentException("You can only remove your own waitlist entries");
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
     * by creating an APPROVED booking for them and sending a notification.
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
}
