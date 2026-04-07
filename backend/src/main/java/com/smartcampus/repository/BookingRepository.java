package com.smartcampus.repository;

import com.smartcampus.model.Booking;
import com.smartcampus.model.Booking.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByUserId(Long userId);
    List<Booking> findByResourceId(Long resourceId);
    List<Booking> findByStatus(BookingStatus status);

    // Check for overlapping bookings on same resource
    @Query("SELECT b FROM Booking b WHERE b.resource.id = :resourceId " +
           "AND b.status NOT IN ('CANCELLED', 'REJECTED') " +
           "AND b.startTime < :endTime AND b.endTime > :startTime")
    List<Booking> findConflictingBookings(
            @Param("resourceId") Long resourceId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Booking> findAllByOrderByCreatedAtDesc();

    // Filtered query for admin — all params optional
    @Query("SELECT b FROM Booking b WHERE " +
           "(:status IS NULL OR b.status = :status) AND " +
           "(:resourceId IS NULL OR b.resource.id = :resourceId) AND " +
           "(:userId IS NULL OR b.user.id = :userId) AND " +
           "(:startDate IS NULL OR b.startTime >= :startDate) AND " +
           "(:endDate IS NULL OR b.endTime <= :endDate) " +
           "ORDER BY b.createdAt DESC")
    List<Booking> findWithFilters(
            @Param("status") BookingStatus status,
            @Param("resourceId") Long resourceId,
            @Param("userId") Long userId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    // Check availability for a resource in a time window (excludes a booking by id if editing)
    @Query("SELECT COUNT(b) = 0 FROM Booking b WHERE b.resource.id = :resourceId " +
           "AND b.status NOT IN ('CANCELLED', 'REJECTED') " +
           "AND b.startTime < :endTime AND b.endTime > :startTime " +
           "AND (:excludeId IS NULL OR b.id <> :excludeId)")
    boolean isResourceAvailable(
            @Param("resourceId") Long resourceId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("excludeId") Long excludeId);
}
