package com.smartcampus.controller;

import com.smartcampus.dto.WaitlistRequestDTO;
import com.smartcampus.model.WaitlistEntry;
import com.smartcampus.service.WaitlistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/waitlist")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class WaitlistController {

    private final WaitlistService waitlistService;

    // POST /api/waitlist - join waitlist
    @PostMapping
    public ResponseEntity<WaitlistEntry> join(@Valid @RequestBody WaitlistRequestDTO dto) {
        return ResponseEntity.status(201).body(waitlistService.joinWaitlist(dto));
    }

    // GET /api/waitlist/my - current user's waitlist entries
    @GetMapping("/my")
    public ResponseEntity<List<WaitlistEntry>> getMyWaitlist() {
        return ResponseEntity.ok(waitlistService.getCurrentUserWaitlist());
    }

    // GET /api/waitlist/user/{userId} - legacy user-specific route kept for compatibility
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<WaitlistEntry>> getWaitlistByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(waitlistService.getAccessibleWaitlistByUser(userId));
    }

    // DELETE /api/waitlist/{id} - leave waitlist
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> leave(
            @PathVariable Long id,
            @RequestParam(required = false) Long userId) {
        if (userId != null) {
            waitlistService.leaveWaitlist(id, userId);
        } else {
            waitlistService.leaveWaitlist(id);
        }
        return ResponseEntity.noContent().build();
    }

    // GET /api/waitlist?resourceId=&status= - all entries (admin)
    @GetMapping
    public ResponseEntity<List<WaitlistEntry>> getAll(
            @RequestParam(required = false) Long resourceId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(waitlistService.getAllWaitlist(resourceId, status));
    }

    // DELETE /api/waitlist/{id}/admin - admin removes any entry
    @DeleteMapping("/{id}/admin")
    public ResponseEntity<Void> adminRemove(@PathVariable Long id) {
        waitlistService.adminRemove(id);
        return ResponseEntity.noContent().build();
    }

    // GET /api/waitlist/count?resourceId=&startTime=&endTime= - waiting count for a slot
    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getCount(
            @RequestParam Long resourceId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        return ResponseEntity.ok(Map.of("count", waitlistService.getWaitlistCount(resourceId, startTime, endTime)));
    }
}
