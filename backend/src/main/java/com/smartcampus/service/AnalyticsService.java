package com.smartcampus.service;

import com.smartcampus.dto.AnalyticsDTO;
import com.smartcampus.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final BookingRepository bookingRepository;

    private static final String[] HOUR_LABELS = {
        "12 AM","1 AM","2 AM","3 AM","4 AM","5 AM","6 AM","7 AM",
        "8 AM","9 AM","10 AM","11 AM","12 PM","1 PM","2 PM","3 PM",
        "4 PM","5 PM","6 PM","7 PM","8 PM","9 PM","10 PM","11 PM"
    };

    public List<AnalyticsDTO.PeakHourDTO> getPeakHours() {
        List<Object[]> rows = bookingRepository.countBookingsByHour();
        long[] counts = new long[24];
        for (Object[] row : rows) {
            int hour = ((Number) row[0]).intValue();
            long count = ((Number) row[1]).longValue();
            counts[hour] = count;
        }
        List<AnalyticsDTO.PeakHourDTO> result = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            result.add(new AnalyticsDTO.PeakHourDTO(h, HOUR_LABELS[h], counts[h]));
        }
        return result;
    }

    public List<AnalyticsDTO.TopResourceDTO> getTopResources(int limit) {
        List<Object[]> rows = bookingRepository.countBookingsByResource();
        List<AnalyticsDTO.TopResourceDTO> result = new ArrayList<>();
        for (int i = 0; i < Math.min(limit, rows.size()); i++) {
            Object[] row = rows.get(i);
            result.add(new AnalyticsDTO.TopResourceDTO(
                ((Number) row[0]).longValue(),
                (String) row[1],
                (String) row[2],
                (String) row[3],
                ((Number) row[4]).longValue()
            ));
        }
        return result;
    }
}
