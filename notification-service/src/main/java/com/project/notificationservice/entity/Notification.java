package com.project.notificationservice.entity;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "admin_notifications")
@Data
public class Notification {

    @Id
    private String id;

    private String type;       // PENDING_OWNER, PENDING_DRIVER, ACTIVITY

    private String message;

    private String actorEmail; // stored for display; null for PENDING_* types

    /**
     * ALL_ADMINS      → every ADMIN and SUPER_ADMIN sees it
     * SUPER_ADMIN_ONLY → only SUPER_ADMIN sees it
     */
    private String visibleTo;

    @CreatedDate
    private LocalDateTime createdAt;
}
