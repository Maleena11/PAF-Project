package com.smartcampus.dto;

import com.smartcampus.model.Booking;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class BookingSlotDTO {
    private Long id;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Booking.BookingStatus status;

    public static BookingSlotDTO from(Booking booking) {
        return new BookingSlotDTO(
                booking.getId(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getStatus()
        );
    }
}
