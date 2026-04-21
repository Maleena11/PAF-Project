package com.smartcampus.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WaitlistRequestDTO {

    @NotNull(message = "Resource ID is required")
    private Long resourceId;

    @NotNull(message = "Slot start time is required")
    private LocalDateTime slotStart;

    @NotNull(message = "Slot end time is required")
    private LocalDateTime slotEnd;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Purpose is required")
    private String purpose;

    @Min(value = 1, message = "Expected attendees must be at least 1")
    private Integer expectedAttendees;

    private String notes;
}
