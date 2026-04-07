package com.smartcampus.service;

import com.smartcampus.dto.BookingRequestDTO;
import com.smartcampus.dto.BookingStatusUpdateDTO;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.Booking;
import com.smartcampus.model.Booking.BookingStatus;
import com.smartcampus.model.Notification;
import com.smartcampus.model.Resource;
import com.smartcampus.model.User;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.ResourceRepository;
import com.smartcampus.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public Booking createBooking(BookingRequestDTO dto) {
        if (!dto.getEndTime().isAfter(dto.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        Resource resource = resourceRepository.findById(dto.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + dto.getResourceId()));

        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + dto.getUserId()));

        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                dto.getResourceId(), dto.getStartTime(), dto.getEndTime());
        if (!conflicts.isEmpty()) {
            throw new IllegalStateException("Resource '" + resource.getName() + "' is already booked during this time slot");
        }

        Booking booking = Booking.builder()
                .resource(resource)
                .user(user)
                .title(dto.getTitle())
                .purpose(dto.getPurpose())
                .expectedAttendees(dto.getExpectedAttendees())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .notes(dto.getNotes())
                .status(BookingStatus.PENDING)
                .build();

        Booking saved = bookingRepository.save(booking);

        notificationService.createNotification(
                user,
                "Booking Submitted",
                "Your booking for '" + resource.getName() + "' is pending approval.",
                Notification.NotificationType.BOOKING,
                saved.getId());

        return saved;
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
