package com.smartcampus.dto;

import com.smartcampus.model.Ticket.TicketCategory;
import com.smartcampus.model.Ticket.TicketPriority;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketRequestDTO {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Category is required")
    private TicketCategory category;

    private TicketPriority priority = TicketPriority.MEDIUM;

    @NotNull(message = "User ID is required")
    private Long userId;
}
