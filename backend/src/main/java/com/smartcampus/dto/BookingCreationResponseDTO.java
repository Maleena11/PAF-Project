package com.smartcampus.dto;

import com.smartcampus.model.Booking;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BookingCreationResponseDTO {

    /** The parent (first) booking of the series, or the single booking. */
    private Booking booking;

    /** Total number of bookings created, including the parent. */
    private int totalCreated;

    /** Occurrences skipped because they conflicted with existing bookings. */
    private int skippedConflicts;
}
