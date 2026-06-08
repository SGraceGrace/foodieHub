package com.project.foodieHub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class NotificationDTO {
    private Long id;           // source entity ID (user ID or activityLog ID)
    private String type;       // "ACTIVITY", "PENDING_OWNER", "PENDING_DRIVER"
    private String message;
    private String actorEmail; // null for PENDING_OWNER / PENDING_DRIVER
    private LocalDateTime timestamp;
}
