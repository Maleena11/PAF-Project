package com.smartcampus.controller;

import com.smartcampus.dto.BookingCreationResponseDTO;
import com.smartcampus.dto.BookingRequestDTO;
import com.smartcampus.dto.BookingSlotDTO;
import com.smartcampus.dto.BookingStatusUpdateDTO;
import com.smartcampus.model.Booking;
import com.smartcampus.model.Booking.BookingStatus;
import com.smartcampus.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    // GET /api/bookings  — admin uses query params to filter; no params = all bookings
    @GetMapping
    public ResponseEntity<List<Booking>> getBookings(
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) Long resourceId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        boolean hasFilter = status != null || resourceId != null
                || userId != null || startDate != null || endDate != null;

        List<Booking> result = bookingService.getAccessibleBookings(
                status, resourceId, userId, startDate, endDate, hasFilter);

        return ResponseEntity.ok(result);
    }

    // GET /api/bookings/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Booking> getBookingById(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.getAccessibleBookingById(id));
    }

    // GET /api/bookings/user/{userId}
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Booking>> getBookingsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(bookingService.getAccessibleBookingsByUser(userId));
    }

    // GET /api/bookings/resource/{resourceId}?date=ISO_DATETIME (date optional)
    @GetMapping("/resource/{resourceId}")
    public ResponseEntity<List<Booking>> getBookingsByResource(
            @PathVariable Long resourceId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime date) {
        return ResponseEntity.ok(bookingService.getAccessibleBookingsByResource(resourceId, date));
    }

    // GET /api/bookings/resource/{resourceId}/slots?date=ISO_DATETIME
    @GetMapping("/resource/{resourceId}/slots")
    public ResponseEntity<List<BookingSlotDTO>> getBookingSlotsByResource(
            @PathVariable Long resourceId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime date) {
        return ResponseEntity.ok(bookingService.getBookingSlotsByResource(resourceId, date));
    }

    // GET /api/bookings/availability?resourceId=&startTime=&endTime=
    @GetMapping("/availability")
    public ResponseEntity<Map<String, Boolean>> checkAvailability(
            @RequestParam Long resourceId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(required = false) Long excludeBookingId) {

        boolean available = bookingService.checkAvailability(resourceId, startTime, endTime, excludeBookingId);
        return ResponseEntity.ok(Map.of("available", available));
    }

    // POST /api/bookings  → 201 Created
    @PostMapping
    public ResponseEntity<BookingCreationResponseDTO> createBooking(@Valid @RequestBody BookingRequestDTO dto) {
        return ResponseEntity.status(201).body(bookingService.createBooking(dto));
    }

    // PATCH /api/bookings/{id}/cancel-series  → cancels all future bookings in the series
    @PatchMapping("/{id}/cancel-series")
    public ResponseEntity<Map<String, Integer>> cancelSeries(@PathVariable Long id) {
        int count = bookingService.cancelAccessibleSeries(id);
        return ResponseEntity.ok(Map.of("cancelled", count));
    }

    // PATCH /api/bookings/{id}/status  → approve / reject (with reason) / cancel / complete
    @PatchMapping("/{id}/status")
    public ResponseEntity<Booking> updateBookingStatus(
            @PathVariable Long id,
            @Valid @RequestBody BookingStatusUpdateDTO dto) {
        return ResponseEntity.ok(bookingService.updateBookingStatus(id, dto));
    }

    // PATCH /api/bookings/{id}/cancel  → student cancels their own PENDING or APPROVED booking
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Booking> cancelOwnBooking(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.cancelAccessibleBooking(id));
    }

    // PUT /api/bookings/{id}  → edit/reschedule a PENDING booking (owner only)
    @PutMapping("/{id}")
    public ResponseEntity<Booking> updateBooking(
            @PathVariable Long id,
            @Valid @RequestBody BookingRequestDTO dto) {
        return ResponseEntity.ok(bookingService.updateBooking(id, dto));
    }

    // DELETE /api/bookings/{id}  → 204 No Content
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBooking(@PathVariable Long id) {
        bookingService.deleteBooking(id);
        return ResponseEntity.noContent().build();
    }
}
