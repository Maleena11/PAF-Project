package com.smartcampus.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

public class AnalyticsDTO {

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PeakHourDTO {
        private int hour;
        private String label;
        private long count;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TopResourceDTO {
        private Long resourceId;
        private String name;
        private String type;
        private String location;
        private long bookingCount;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AnalyticsSummaryDTO {
        private List<PeakHourDTO> peakHours;
        private List<TopResourceDTO> topResources;
    }
}
