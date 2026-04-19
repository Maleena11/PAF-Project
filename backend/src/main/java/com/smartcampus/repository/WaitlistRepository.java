package com.smartcampus.repository;

import com.smartcampus.model.WaitlistEntry;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface WaitlistRepository extends JpaRepository<WaitlistEntry, Long> {

    List<WaitlistEntry> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Entries whose requested slot fits entirely within the freed booking window,
     * ordered oldest-first (fair queue).
     */
    @Query("SELECT w FROM WaitlistEntry w WHERE w.resource.id = :resourceId " +
           "AND w.status = 'WAITING' " +
           "AND w.slotStart >= :freedStart AND w.slotEnd <= :freedEnd " +
           "ORDER BY w.createdAt ASC")
    List<WaitlistEntry> findEligibleForPromotion(
            @Param("resourceId") Long resourceId,
            @Param("freedStart") LocalDateTime freedStart,
            @Param("freedEnd")   LocalDateTime freedEnd);

    /** Count WAITING entries that overlap a given slot (for display on the picker). */
    @Query("SELECT COUNT(w) FROM WaitlistEntry w WHERE w.resource.id = :resourceId " +
           "AND w.status = 'WAITING' " +
           "AND w.slotStart < :slotEnd AND w.slotEnd > :slotStart")
    long countWaiting(
            @Param("resourceId") Long resourceId,
            @Param("slotStart")  LocalDateTime slotStart,
            @Param("slotEnd")    LocalDateTime slotEnd);

    /** All entries filtered by optional resourceId and/or status (admin view). */
    @Query("SELECT w FROM WaitlistEntry w WHERE " +
           "(:resourceId IS NULL OR w.resource.id = :resourceId) AND " +
           "(:status IS NULL OR w.status = :status) " +
           "ORDER BY w.createdAt DESC")
    List<WaitlistEntry> findAllWithFilters(
            @Param("resourceId") Long resourceId,
            @Param("status")     WaitlistEntry.WaitlistStatus status);

    /** Count WAITING entries for the same resource+slot that were created before the given timestamp (queue position). */
    @Query("SELECT COUNT(w) FROM WaitlistEntry w WHERE w.resource.id = :resourceId " +
           "AND w.status = 'WAITING' " +
           "AND w.slotStart = :slotStart AND w.slotEnd = :slotEnd " +
           "AND w.createdAt < :createdAt")
    long countAhead(
            @Param("resourceId") Long resourceId,
            @Param("slotStart")  LocalDateTime slotStart,
            @Param("slotEnd")    LocalDateTime slotEnd,
            @Param("createdAt")  LocalDateTime createdAt);

    /** Prevent duplicate WAITING entries for the same user + resource + exact slot. */
    @Query("SELECT COUNT(w) > 0 FROM WaitlistEntry w WHERE w.resource.id = :resourceId " +
           "AND w.user.id = :userId AND w.status = 'WAITING' " +
           "AND w.slotStart = :slotStart AND w.slotEnd = :slotEnd")
    boolean existsWaitingEntry(
            @Param("resourceId") Long resourceId,
            @Param("userId")     Long userId,
            @Param("slotStart")  LocalDateTime slotStart,
            @Param("slotEnd")    LocalDateTime slotEnd);
}
