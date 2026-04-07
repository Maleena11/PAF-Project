package com.smartcampus.service;

import com.smartcampus.dto.BookingCreationResponseDTO;
import com.smartcampus.dto.BookingRequestDTO;
import com.smartcampus.dto.BookingStatusUpdateDTO;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.Booking;
import com.smartcampus.model.Booking.BookingStatus;
import com.smartcampus.model.Booking.RecurrenceRule;
import com.smartcampus.model.Notification;
import com.smartcampus.model.Resource;
import com.smartcampus.model.User;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.ResourceRepository;
import com.smartcampus.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final WaitlistService waitlistService;

    public List<Booking> getAllBookings() {
        return bookingRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Booking> getFilteredBookings(BookingStatus status, Long resourceId,
                                              Long userId, LocalDateTime startDate,
                                              LocalDateTime endDate) {
        return bookingRepository.findWithFilters(status, resourceId, userId, startDate, endDate);
    }

    public Booking getBookingById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + id));
    }

    public List<Booking> getBookingsByUser(Long userId) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Booking> getBookingsByResource(Long resourceId) {
        return bookingRepository.findByResourceId(resourceId);
    }

    public boolean checkAvailability(Long resourceId, LocalDateTime startTime,
                                     LocalDateTime endTime, Long excludeId) {
        return bookingRepository.isResourceAvailable(resourceId, startTime, endTime, excludeId);
    }

    public BookingCreationResponseDTO createBooking(BookingRequestDTO dto) {
        if (!dto.getEndTime().isAfter(dto.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        Resource resource = resourceRepository.findById(dto.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + dto.getResourceId()));

        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + dto.getUserId()));

        if (dto.getExpectedAttendees() != null && dto.getExpectedAttendees() > resource.getCapacity()) {
            throw new IllegalArgumentException(
                    "Expected attendees (" + dto.getExpectedAttendees() + ") exceeds the capacity of '"
                    + resource.getName() + "' (" + resource.getCapacity() + ")");
        }

        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                dto.getResourceId(), dto.getStartTime(), dto.getEndTime());
        if (!conflicts.isEmpty()) {
            throw new IllegalStateException("Resource '" + resource.getName() + "' is already booked during this time slot");
        }

        RecurrenceRule rule = dto.getRecurrenceRule() != null ? dto.getRecurrenceRule() : RecurrenceRule.NONE;

        Booking parent = Booking.builder()
                .resource(resource)
                .user(user)
                .title(dto.getTitle())
                .purpose(dto.getPurpose())
                .expectedAttendees(dto.getExpectedAttendees())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .notes(dto.getNotes())
                .status(BookingStatus.PENDING)
                .recurrenceRule(rule)
                .recurrenceEndDate(dto.getRecurrenceEndDate())
                .build();

        Booking saved = bookingRepository.save(parent);

        int[] counts = { 1, 0 }; // [totalCreated, skippedConflicts]
        if (rule != RecurrenceRule.NONE && dto.getRecurrenceEndDate() != null) {
            generateChildren(saved, dto.getRecurrenceEndDate(), counts);
        }

        notificationService.createNotification(
                user,
                "Booking Submitted",
                counts[0] > 1
                        ? "Your recurring booking for '" + resource.getName() + "' has been submitted (" + counts[0] + " occurrences)."
                        : "Your booking for '" + resource.getName() + "' is pending approval.",
                Notification.NotificationType.BOOKING,
                saved.getId());

        return new BookingCreationResponseDTO(saved, counts[0], counts[1]);
    }

    /** Generates child bookings for a recurring series. Skips slots with conflicts. */
    private void generateChildren(Booking parent, LocalDate endDate, int[] counts) {
        Duration slotDuration = Duration.between(parent.getStartTime(), parent.getEndTime());
        LocalDateTime cursor = parent.getStartTime();
        int safeguard = 0;

        while (safeguard++ < 365) {
            cursor = advance(cursor, parent.getRecurrenceRule());
            if (cursor.toLocalDate().isAfter(endDate)) break;

            LocalDateTime childEnd = cursor.plus(slotDuration);

            List<Booking> conflicts = bookingRepository.findConflictingBookings(
                    parent.getResource().getId(), cursor, childEnd);

            if (!conflicts.isEmpty()) {
                counts[1]++;
                continue;
            }

            Booking child = Booking.builder()
                    .resource(parent.getResource())
                    .user(parent.getUser())
                    .title(parent.getTitle())
                    .purpose(parent.getPurpose())
                    .expectedAttendees(parent.getExpectedAttendees())
                    .startTime(cursor)
                    .endTime(childEnd)
                    .notes(parent.getNotes())
                    .status(BookingStatus.PENDING)
                    .recurrenceRule(parent.getRecurrenceRule())
                    .recurrenceEndDate(parent.getRecurrenceEndDate())
                    .parentBookingId(parent.getId())
                    .build();

            bookingRepository.save(child);
            counts[0]++;
        }
    }

    private LocalDateTime advance(LocalDateTime dt, RecurrenceRule rule) {
        return switch (rule) {
            case DAILY   -> dt.plusDays(1);
            case WEEKLY  -> dt.plusWeeks(1);
            case MONTHLY -> dt.plusMonths(1);
            default      -> throw new IllegalArgumentException("Not a recurring rule: " + rule);
        };
    }

    /**
     * Cancels all PENDING/APPROVED bookings in the same series as the given booking.
     * Works whether the given id is the parent or any child.
     */
    public int cancelSeries(Long bookingId) {
        Booking booking = getBookingById(bookingId);
        Long parentId = booking.getParentBookingId() != null ? booking.getParentBookingId() : booking.getId();

        List<Booking> series = bookingRepository.findSeriesBookings(parentId);
        int cancelled = 0;
        for (Booking b : series) {
            if (b.getStatus() == BookingStatus.PENDING || b.getStatus() == BookingStatus.APPROVED) {
                b.setStatus(BookingStatus.CANCELLED);
                bookingRepository.save(b);
                cancelled++;
            }
        }
        return cancelled;
    }

    public Booking updateBookingStatus(Long id, BookingStatusUpdateDTO dto) {
        Booking booking = getBookingById(id);
        validateTransition(booking.getStatus(), dto.getStatus());

        if (dto.getStatus() == BookingStatus.REJECTED) {
            if (dto.getReason() == null || dto.getReason().isBlank()) {
                throw new IllegalArgumentException("A reason is required when rejecting a booking");
            }
            booking.setRejectionReason(dto.getReason());
        }

        booking.setStatus(dto.getStatus());
        Booking updated = bookingRepository.save(booking);

        // When a booking is cancelled, try to promote the next person on the waitlist
        if (dto.getStatus() == BookingStatus.CANCELLED) {
            waitlistService.promoteFromWaitlist(updated);
        }

        String message = buildStatusMessage(booking.getResource().getName(), dto.getStatus(), dto.getReason());
        notificationService.createNotification(
                booking.getUser(),
                "Booking " + dto.getStatus().name(),
                message,
                Notification.NotificationType.BOOKING,
                id);

        return updated;
    }

    public void deleteBooking(Long id) {
        Booking booking = getBookingById(id);
        bookingRepository.delete(booking);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private void validateTransition(BookingStatus current, BookingStatus next) {
        boolean valid = switch (current) {
            case PENDING  -> next == BookingStatus.APPROVED || next == BookingStatus.REJECTED || next == BookingStatus.CANCELLED;
            case APPROVED -> next == BookingStatus.CANCELLED || next == BookingStatus.COMPLETED;
            default       -> false;
        };
        if (!valid) {
            throw new IllegalArgumentException(
                    "Cannot transition booking from " + current + " to " + next);
        }
    }

    private String buildStatusMessage(String resourceName, BookingStatus status, String reason) {
        return switch (status) {
            case APPROVED  -> "Your booking for '" + resourceName + "' has been approved.";
            case REJECTED  -> "Your booking for '" + resourceName + "' was rejected. Reason: " + reason;
            case CANCELLED -> "Your booking for '" + resourceName + "' has been cancelled.";
            case COMPLETED -> "Your booking for '" + resourceName + "' has been marked as completed.";
            default        -> "Your booking for '" + resourceName + "' status changed to " + status.name().toLowerCase() + ".";
        };
    }
}
