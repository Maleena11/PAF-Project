package com.smartcampus.service;

import com.smartcampus.dto.TicketRequestDTO;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.*;
import com.smartcampus.model.Notification.NotificationType;
import com.smartcampus.model.Ticket.TicketStatus;
import com.smartcampus.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
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
                .location(dto.getLocation())
                .contactDetails(dto.getContactDetails())
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

    public Ticket updateTicket(Long id, TicketRequestDTO dto) {
        Ticket ticket = getTicketById(id);
        ticket.setTitle(dto.getTitle());
        ticket.setDescription(dto.getDescription());
        ticket.setCategory(dto.getCategory());
        ticket.setPriority(dto.getPriority());
        ticket.setLocation(dto.getLocation());
        ticket.setContactDetails(dto.getContactDetails());
        ticket.setStatus(TicketStatus.OPEN);

        Ticket updated = ticketRepository.save(ticket);

        notificationService.createNotification(ticket.getUser(),
                "Ticket Resent",
                "Your ticket #" + id + " has been updated and resent.",
                NotificationType.TICKET,
                id);

        return updated;
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

    public Ticket setImageUrl(Long id, String imageUrl, int slot) {
        Ticket ticket = getTicketById(id);
        if (slot == 2) ticket.setImageUrl2(imageUrl);
        else if (slot == 3) ticket.setImageUrl3(imageUrl);
        else ticket.setImageUrl(imageUrl);
        return ticketRepository.save(ticket);
    }

    public Ticket removeImageUrl(Long id, int slot) {
        Ticket ticket = getTicketById(id);
        if (slot == 2) ticket.setImageUrl2(null);
        else if (slot == 3) ticket.setImageUrl3(null);
        else ticket.setImageUrl(null);
        return ticketRepository.save(ticket);
    }

    public List<Ticket> getTicketsAssignedTo(Long userId) {
        return ticketRepository.findByAssignedToId(userId);
    }

    private void assertNotTerminal(Ticket ticket) {
        if (ticket.getStatus() == TicketStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ticket #" + ticket.getId() + " has been rejected and cannot be modified.");
        }
        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ticket #" + ticket.getId() + " is closed and cannot be modified.");
        }
    }

    public Ticket assignTicket(Long ticketId, Long assigneeId) {
        Ticket ticket = getTicketById(ticketId);
        assertNotTerminal(ticket);
        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + assigneeId));
        ticket.setAssignedTo(assignee);
        Ticket updated = ticketRepository.save(ticket);

        notificationService.createNotification(assignee,
                "Ticket Assigned to You",
                "Ticket #" + ticketId + " \"" + ticket.getTitle() + "\" has been assigned to you.",
                NotificationType.TICKET, ticketId);

        notificationService.createNotification(ticket.getUser(),
                "Technician Assigned",
                assignee.getName() + " has been assigned to your ticket #" + ticketId + ".",
                NotificationType.TICKET, ticketId);

        return updated;
    }

    public Ticket startWork(Long ticketId, Long staffId) {
        Ticket ticket = getTicketById(ticketId);
        assertNotTerminal(ticket);
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        if (ticket.getFirstResponseAt() == null) {
            ticket.setFirstResponseAt(LocalDateTime.now());
        }
        Ticket updated = ticketRepository.save(ticket);

        notificationService.createNotification(ticket.getUser(),
                "Work Started on Ticket #" + ticketId,
                "A technician has started working on your ticket \"" + ticket.getTitle() + "\".",
                NotificationType.TICKET, ticketId);

        return updated;
    }

    public Ticket resolveTicket(Long ticketId, String resolutionNotes) {
        Ticket ticket = getTicketById(ticketId);
        assertNotTerminal(ticket);
        ticket.setStatus(TicketStatus.RESOLVED);
        ticket.setResolutionNotes(resolutionNotes);
        ticket.setResolvedAt(LocalDateTime.now());
        Ticket updated = ticketRepository.save(ticket);

        notificationService.createNotification(ticket.getUser(),
                "Ticket #" + ticketId + " Resolved",
                "Your ticket \"" + ticket.getTitle() + "\" has been resolved. Notes: " + resolutionNotes,
                NotificationType.TICKET, ticketId);

        return updated;
    }

    public Ticket closeTicket(Long ticketId) {
        Ticket ticket = getTicketById(ticketId);
        if (ticket.getStatus() == TicketStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rejected tickets cannot be closed.");
        }
        ticket.setStatus(TicketStatus.CLOSED);
        Ticket updated = ticketRepository.save(ticket);

        notificationService.createNotification(ticket.getUser(),
                "Ticket #" + ticketId + " Closed",
                "Your ticket \"" + ticket.getTitle() + "\" has been closed.",
                NotificationType.TICKET, ticketId);

        return updated;
    }

    public Ticket rejectTicket(Long ticketId, String reason) {
        Ticket ticket = getTicketById(ticketId);
        if (ticket.getStatus() == TicketStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket is already rejected.");
        }
        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Closed tickets cannot be rejected.");
        }

        User previousAssignee = ticket.getAssignedTo();
        ticket.setStatus(TicketStatus.REJECTED);
        ticket.setRejectionReason(reason);
        ticket.setRejectedAt(LocalDateTime.now());
        ticket.setAssignedTo(null);
        Ticket updated = ticketRepository.save(ticket);

        notificationService.createNotification(ticket.getUser(),
                "Ticket #" + ticketId + " Rejected",
                "Your ticket \"" + ticket.getTitle() + "\" was rejected. Reason: " + reason,
                NotificationType.TICKET, ticketId);

        if (previousAssignee != null) {
            notificationService.createNotification(previousAssignee,
                    "Ticket #" + ticketId + " Rejected & Unassigned",
                    "Ticket \"" + ticket.getTitle() + "\" has been rejected by admin and unassigned from you.",
                    NotificationType.TICKET, ticketId);
        }

        return updated;
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
