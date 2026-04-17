package com.smartcampus.service;

import com.smartcampus.dto.TicketRequestDTO;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.*;
import com.smartcampus.model.Notification.NotificationType;
import com.smartcampus.model.Ticket.TicketStatus;
import com.smartcampus.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TicketService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public List<Ticket> getAllTickets() {
        return ticketRepository.findAllByOrderByCreatedAtDesc();
    }

    public Ticket getTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found with id: " + id));
    }

    public List<Ticket> getTicketsByUser(Long userId) {
        return ticketRepository.findByUserId(userId);
    }

    public List<Ticket> getTicketsByStatus(TicketStatus status) {
        return ticketRepository.findByStatusOrderByCreatedAtDesc(status);
    }

    public Ticket createTicket(TicketRequestDTO dto) {
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + dto.getUserId()));

        Ticket ticket = Ticket.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .category(dto.getCategory())
                .priority(dto.getPriority())
                .user(user)
                .status(TicketStatus.OPEN)
                .build();

        Ticket saved = ticketRepository.save(ticket);

        // Notify the submitter
        notificationService.createNotification(user,
                "Ticket Submitted",
                "Your ticket '" + ticket.getTitle() + "' (#" + saved.getId() + ") has been submitted.",
                NotificationType.TICKET,
                saved.getId());

        // Notify all admins
        userRepository.findByRole(User.Role.ADMIN).forEach(admin ->
                notificationService.createNotification(admin,
                        "New Ticket Submitted",
                        user.getName() + " submitted ticket #" + saved.getId() + ": \"" + ticket.getTitle() + "\"",
                        NotificationType.TICKET,
                        saved.getId())
        );

        return saved;
    }

    public Ticket updateTicketStatus(Long id, TicketStatus status) {
        Ticket ticket = getTicketById(id);
        ticket.setStatus(status);
        if (status == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(LocalDateTime.now());
        }
        Ticket updated = ticketRepository.save(ticket);

        notificationService.createNotification(ticket.getUser(),
                "Ticket Updated",
                "Ticket #" + id + " status changed to " + status.name().replace("_", " ") + ".",
                NotificationType.TICKET,
                id);

        return updated;
    }

    public Ticket setImageUrl(Long id, String imageUrl) {
        Ticket ticket = getTicketById(id);
        ticket.setImageUrl(imageUrl);
        return ticketRepository.save(ticket);
    }

    public Ticket assignTicket(Long ticketId, Long assigneeId) {
        Ticket ticket = getTicketById(ticketId);
        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + assigneeId));
        ticket.setAssignedTo(assignee);
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        return ticketRepository.save(ticket);
    }

    public Comment addComment(Long ticketId, Long userId, String content) {
        Ticket ticket = getTicketById(ticketId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Comment comment = Comment.builder()
                .ticket(ticket)
                .user(user)
                .content(content)
                .build();

        ticket.getComments().add(comment);
        ticketRepository.save(ticket);

        String preview = content.length() > 60 ? content.substring(0, 60) + "..." : content;

        if (!user.getId().equals(ticket.getUser().getId())) {
            // Someone else commented → notify the ticket owner
            notificationService.createNotification(
                    ticket.getUser(),
                    "New Comment on Ticket #" + ticketId,
                    user.getName() + " commented: \"" + preview + "\"",
                    NotificationType.TICKET,
                    ticketId);
        } else {
            // Ticket owner replied → notify the assignee, or all admins if unassigned
            if (ticket.getAssignedTo() != null) {
                notificationService.createNotification(
                        ticket.getAssignedTo(),
                        "Reply on Ticket #" + ticketId,
                        user.getName() + " replied: \"" + preview + "\"",
                        NotificationType.TICKET,
                        ticketId);
            } else {
                userRepository.findByRole(User.Role.ADMIN).forEach(admin ->
                        notificationService.createNotification(
                                admin,
                                "Reply on Ticket #" + ticketId,
                                user.getName() + " replied: \"" + preview + "\"",
                                NotificationType.TICKET,
                                ticketId));
            }
        }

        return comment;
    }

    public void deleteTicket(Long id) {
        Ticket ticket = getTicketById(id);
        ticketRepository.delete(ticket);
    }
}
