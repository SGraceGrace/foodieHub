package com.project.notificationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class NotificationDTO {
    private String id;         // MongoDB ObjectId string
    private String type;       // PENDING_OWNER, PENDING_DRIVER, ACTIVITY
    private String message;
    private String actorEmail;
    private LocalDateTime timestamp;
}
