package com.smartcampus.dto;

import com.smartcampus.model.Booking.BookingStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingStatusUpdateDTO {

    @NotNull(message = "Status is required")
    private BookingStatus status;

    // Required only when status is REJECTED
    private String reason;
}
