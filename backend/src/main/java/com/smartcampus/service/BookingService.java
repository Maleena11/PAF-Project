package com.smartcampus.service;

import com.smartcampus.dto.BookingCreationResponseDTO;
import com.smartcampus.dto.BookingRequestDTO;
import com.smartcampus.dto.BookingSlotDTO;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class BookingService {
    private static final EnumSet<BookingStatus> MANAGER_ALLOWED_STATUS_UPDATES =
            EnumSet.of(BookingStatus.APPROVED, BookingStatus.REJECTED, BookingStatus.CANCELLED, BookingStatus.COMPLETED);

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final WaitlistService waitlistService;

    public List<Booking> getAccessibleBookings(BookingStatus status, Long resourceId,
                                               Long userId, LocalDateTime startDate,
                                               LocalDateTime endDate, boolean hasFilter) {
        User currentUser = getCurrentUser();

        if (isAdmin(currentUser)) {
            return hasFilter
                    ? getFilteredBookings(status, resourceId, userId, startDate, endDate)
                    : getAllBookings();
        }

        if (userId != null && !userId.equals(currentUser.getId())) {
            throw new AccessDeniedException("Students can only view their own bookings");
        }

        return getFilteredBookings(status, resourceId, currentUser.getId(), startDate, endDate);
    }

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

    public Booking getAccessibleBookingById(Long id) {
        Booking booking = getBookingById(id);
        verifyBookingReadAccess(booking);
        return booking;
    }

    public List<Booking> getBookingsByUser(Long userId) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Booking> getAccessibleBookingsByUser(Long userId) {
        User currentUser = getCurrentUser();
        if (!isAdmin(currentUser) && !currentUser.getId().equals(userId)) {
            throw new AccessDeniedException("Students can only view their own bookings");
        }
        return getBookingsByUser(userId);
    }

    public List<Booking> getBookingsByResource(Long resourceId, LocalDateTime date) {
        if (date != null) {
            LocalDateTime startOfDay = date.toLocalDate().atStartOfDay();
            LocalDateTime endOfDay = startOfDay.plusDays(1);
            return bookingRepository.findByResourceIdAndDate(resourceId, startOfDay, endOfDay);
        }
        return bookingRepository.findByResourceId(resourceId);
    }

    public List<Booking> getAccessibleBookingsByResource(Long resourceId, LocalDateTime date) {
        User currentUser = getCurrentUser();
        List<Booking> bookings = getBookingsByResource(resourceId, date);

        if (isAdmin(currentUser)) {
            return bookings;
        }

        return bookings.stream()
                .filter(booking -> booking.getUser().getId().equals(currentUser.getId()))
                .toList();
    }

    public List<BookingSlotDTO> getBookingSlotsByResource(Long resourceId, LocalDateTime date) {
        return getBookingsByResource(resourceId, date).stream()
                .map(BookingSlotDTO::from)
                .toList();
    }

    public boolean checkAvailability(Long resourceId, LocalDateTime startTime,
                                     LocalDateTime endTime, Long excludeId) {
        return bookingRepository.isResourceAvailable(resourceId, startTime, endTime, excludeId);
    }

    public BookingCreationResponseDTO createBooking(BookingRequestDTO dto) {
        Resource resource = resourceRepository.findById(dto.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + dto.getResourceId()));

        User user = getCurrentUser();
        RecurrenceRule rule = normalizeRecurrenceRule(dto);
        validateBookingRequest(dto, resource, null, rule);

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
     * Cancels all APPROVED bookings in the same series as the given booking.
     * This keeps the required core workflow intact: PENDING -> APPROVED/REJECTED,
     * with CANCELLED used only as a post-approval extension.
     */
    public int cancelSeries(Long bookingId) {
        Booking booking = getBookingById(bookingId);
        User actor = getCurrentUser();
        Long parentId = booking.getParentBookingId() != null ? booking.getParentBookingId() : booking.getId();

        List<Booking> series = bookingRepository.findSeriesBookings(parentId);
        int cancelled = 0;
        for (Booking b : series) {
            if (b.getStatus() == BookingStatus.APPROVED || b.getStatus() == BookingStatus.PENDING) {
                applyCancellationAudit(b, actor);
                bookingRepository.save(b);
                cancelled++;
            }
        }
        return cancelled;
    }

    public int cancelAccessibleSeries(Long bookingId) {
        Booking booking = getBookingById(bookingId);
        verifyBookingOwnership(booking);
        return cancelSeries(bookingId);
    }

    public Booking updateBookingStatus(Long id, BookingStatusUpdateDTO dto) {
        verifyManagerAccess();
        if (!MANAGER_ALLOWED_STATUS_UPDATES.contains(dto.getStatus())) {
            throw new AccessDeniedException("Only admins or staff can approve, reject, or complete bookings");
        }

        User actor = getCurrentUser();
        Booking booking = getBookingById(id);
        validateTransition(booking.getStatus(), dto.getStatus());

        if (dto.getStatus() == BookingStatus.REJECTED) {
            if (dto.getReason() == null || dto.getReason().isBlank()) {
                throw new IllegalArgumentException("A reason is required when rejecting a booking");
            }
            booking.setRejectionReason(dto.getReason());
        }

        booking.setStatus(dto.getStatus());
        applyStatusAudit(booking, dto.getStatus(), actor);
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

    public Booking cancelAccessibleBooking(Long bookingId) {
        Booking booking = getBookingById(bookingId);
        User actor = getCurrentUser();
        verifyBookingOwnership(booking);
        if (booking.getStatus() != BookingStatus.APPROVED && booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalStateException("Only PENDING or APPROVED bookings can be cancelled");
        }
        applyCancellationAudit(booking, actor);
        Booking updated = bookingRepository.save(booking);
        waitlistService.promoteFromWaitlist(updated);
        String message = buildStatusMessage(booking.getResource().getName(), BookingStatus.CANCELLED, null);
        notificationService.createNotification(
                booking.getUser(), "Booking Cancelled", message,
                Notification.NotificationType.BOOKING, bookingId);
        return updated;
    }

    public Booking updateBooking(Long id, BookingRequestDTO dto) {
        Booking booking = getBookingById(id);
        verifyBookingOwnership(booking);
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalStateException("Only PENDING bookings can be edited");
        }
        Resource resource = resourceRepository.findById(dto.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + dto.getResourceId()));
        RecurrenceRule rule = normalizeRecurrenceRule(dto);
        validateBookingRequest(dto, resource, id, rule);
        booking.setResource(resource);
        booking.setTitle(dto.getTitle());
        booking.setPurpose(dto.getPurpose());
        booking.setExpectedAttendees(dto.getExpectedAttendees());
        booking.setStartTime(dto.getStartTime());
        booking.setEndTime(dto.getEndTime());
        booking.setNotes(dto.getNotes());
        booking.setRecurrenceRule(rule);
        booking.setRecurrenceEndDate(rule == RecurrenceRule.NONE ? null : dto.getRecurrenceEndDate());
        Booking updated = bookingRepository.save(booking);
        notificationService.createNotification(
                booking.getUser(), "Booking Updated",
                "Your booking for '" + resource.getName() + "' has been updated.",
                Notification.NotificationType.BOOKING, id);
        return updated;
    }

    public List<Booking> getBookingsByResourceForDate(Long resourceId, LocalDateTime startOfDay, LocalDateTime endOfDay) {
        return bookingRepository.findByResourceIdAndDate(resourceId, startOfDay, endOfDay);
    }

    public void deleteBooking(Long id) {
        Booking booking = getBookingById(id);
        User actor = getCurrentUser();

        if (isAdminOrStaff(actor)) {
            bookingRepository.delete(booking);
            return;
        }

        if (!booking.getUser().getId().equals(actor.getId())) {
            throw new AccessDeniedException("Only the booking owner can delete their own bookings");
        }

        if (booking.getStatus() != BookingStatus.CANCELLED && booking.getStatus() != BookingStatus.REJECTED) {
             throw new IllegalStateException("Students can only delete cancelled or rejected bookings");
        }

        bookingRepository.delete(booking);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private RecurrenceRule normalizeRecurrenceRule(BookingRequestDTO dto) {
        return dto.getRecurrenceRule() != null ? dto.getRecurrenceRule() : RecurrenceRule.NONE;
    }

    private void validateBookingRequest(BookingRequestDTO dto, Resource resource, Long excludeBookingId, RecurrenceRule rule) {
        if (dto.getStartTime() == null || dto.getEndTime() == null) {
            throw new IllegalArgumentException("Start time and end time are required");
        }
        if (!dto.getStartTime().isBefore(dto.getEndTime())) {
            throw new IllegalArgumentException("Start time must be before end time");
        }
        if (!dto.getStartTime().isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("Booking start time must be in the future");
        }
        if (dto.getExpectedAttendees() != null && dto.getExpectedAttendees() > resource.getCapacity()) {
            throw new IllegalArgumentException(
                    "Expected attendees (" + dto.getExpectedAttendees() + ") exceeds the capacity of '"
                    + resource.getName() + "' (" + resource.getCapacity() + ")");
        }

        validateRecurrence(dto, rule);

        if (!bookingRepository.isResourceAvailable(dto.getResourceId(), dto.getStartTime(), dto.getEndTime(), excludeBookingId)) {
            throw new IllegalStateException("Resource '" + resource.getName() + "' is not available for the requested time");
        }
    }

    private void validateRecurrence(BookingRequestDTO dto, RecurrenceRule rule) {
        if (rule == RecurrenceRule.NONE) {
            if (dto.getRecurrenceEndDate() != null) {
                throw new IllegalArgumentException("recurrenceEndDate must be omitted when recurrenceRule is NONE");
            }
            return;
        }

        if (dto.getRecurrenceEndDate() == null) {
            throw new IllegalArgumentException("recurrenceEndDate is required when recurrenceRule is not NONE");
        }
        if (dto.getStartTime() != null && dto.getRecurrenceEndDate().isBefore(dto.getStartTime().toLocalDate())) {
            throw new IllegalArgumentException("recurrenceEndDate must be on or after the booking start date");
        }
    }

    private void applyStatusAudit(Booking booking, BookingStatus status, User actor) {
        LocalDateTime now = LocalDateTime.now();

        switch (status) {
            case APPROVED -> {
                booking.setApprovedBy(actor);
                booking.setApprovedAt(now);
                booking.setRejectedBy(null);
                booking.setRejectedAt(null);
                booking.setRejectionReason(null);
                booking.setCancelledBy(null);
                booking.setCancelledAt(null);
            }
            case REJECTED -> {
                booking.setRejectedBy(actor);
                booking.setRejectedAt(now);
                booking.setApprovedBy(null);
                booking.setApprovedAt(null);
                booking.setCancelledBy(null);
                booking.setCancelledAt(null);
            }
            case COMPLETED -> {
                if (booking.getApprovedBy() == null) {
                    booking.setApprovedBy(actor);
                }
                if (booking.getApprovedAt() == null) {
                    booking.setApprovedAt(now);
                }
            }
            default -> {
            }
        }
    }

    private void applyCancellationAudit(Booking booking, User actor) {
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledBy(actor);
        booking.setCancelledAt(LocalDateTime.now());
    }

    private void validateTransition(BookingStatus current, BookingStatus next) {
        boolean valid = switch (current) {
            case PENDING  -> next == BookingStatus.APPROVED || next == BookingStatus.REJECTED;
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

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new AccessDeniedException("Authentication is required");
        }

        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("Authenticated user was not found"));
    }

    private void verifyBookingReadAccess(Booking booking) {
        User currentUser = getCurrentUser();
        if (!canReadBooking(currentUser, booking)) {
            throw new AccessDeniedException("Students can only access their own bookings");
        }
    }

    private void verifyBookingOwnership(Booking booking) {
        User currentUser = getCurrentUser();
        if (!booking.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Only the booking owner can modify or cancel this booking");
        }
    }

    private void verifyManagerAccess() {
        if (!isAdminOrStaff(getCurrentUser())) {
            throw new AccessDeniedException("Only admins or staff can perform this action");
        }
    }

    private boolean canReadBooking(User user, Booking booking) {
        return isAdminOrStaff(user) || booking.getUser().getId().equals(user.getId());
    }

    private boolean isAdmin(User user) {
        return user.getRole() == User.Role.ADMIN;
    }

    private boolean isAdminOrStaff(User user) {
        return user.getRole() == User.Role.ADMIN || user.getRole() == User.Role.STAFF;
    }
}
