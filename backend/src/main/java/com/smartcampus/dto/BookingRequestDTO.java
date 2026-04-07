package com.smartcampus.dto;

import com.smartcampus.model.Booking.RecurrenceRule;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingRequestDTO {

    @NotNull(message = "Resource ID is required")
    private Long resourceId;

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Purpose is required")
    private String purpose;

    @NotNull(message = "Expected attendees is required")
    @Min(value = 1, message = "Expected attendees must be at least 1")
    private Integer expectedAttendees;

    @NotNull(message = "Start time is required")
    @Future(message = "Start time must be in the future")
    private LocalDateTime startTime;

    @NotNull(message = "End time is required")
    private LocalDateTime endTime;

    private String notes;

    /** NONE means single booking (default). DAILY / WEEKLY / MONTHLY triggers recurrence. */
    private RecurrenceRule recurrenceRule;

    /** Required when recurrenceRule != NONE. Last day on which an occurrence may start. */
    private LocalDate recurrenceEndDate;
}
