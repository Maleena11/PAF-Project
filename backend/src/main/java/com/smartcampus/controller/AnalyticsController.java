package com.smartcampus.controller;

import com.smartcampus.dto.AnalyticsDTO;
import com.smartcampus.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/peak-hours")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AnalyticsDTO.PeakHourDTO>> getPeakHours() {
        return ResponseEntity.ok(analyticsService.getPeakHours());
    }

    @GetMapping("/top-resources")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AnalyticsDTO.TopResourceDTO>> getTopResources(
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(analyticsService.getTopResources(limit));
    }
}
