package com.smartcampus.dto;

import com.smartcampus.model.Booking.BookingStatus;
import jakarta.validation.constraints.AssertTrue;
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

    @AssertTrue(message = "A reason is required when rejecting a booking")
    public boolean isReasonPresentWhenRejected() {
        return status != BookingStatus.REJECTED || (reason != null && !reason.isBlank());
    }
}
