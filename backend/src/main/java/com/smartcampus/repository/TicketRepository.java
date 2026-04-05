package com.smartcampus.repository;

import com.smartcampus.model.Ticket;
import com.smartcampus.model.Ticket.TicketStatus;
import com.smartcampus.model.Ticket.TicketPriority;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByUserId(Long userId);
    List<Ticket> findByStatus(TicketStatus status);
    List<Ticket> findByPriority(TicketPriority priority);
    List<Ticket> findByAssignedToId(Long assignedToId);
    List<Ticket> findAllByOrderByCreatedAtDesc();
    List<Ticket> findByStatusOrderByCreatedAtDesc(TicketStatus status);
}
