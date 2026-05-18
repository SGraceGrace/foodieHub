package com.project.foodieHub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class NotificationDTO {
    private String type;          // "ACTIVITY" or "PENDING_OWNER"
    private String message;
    private String actorEmail;    // null for PENDING_OWNER type
    private LocalDateTime timestamp;
}
