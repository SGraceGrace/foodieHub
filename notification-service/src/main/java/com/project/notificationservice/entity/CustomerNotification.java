package com.project.notificationservice.entity;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Stores per-customer order-status notifications in MongoDB.
 * Mirrors the same pattern as RestaurantNotification (restaurant) and
 * Notification (admin) — every notification recipient has a DB-backed store.
 *
 * Consumed by the customer bell in UserHeaderComponent on page load.
 */
@Document(collection = "customer_notifications")
@Data
public class CustomerNotification {

    @Id
    private String id;

    private String userId;          // customer email / X-User-Id from JWT

    /** Always ORDER_STATUS_UPDATE for now — extensible later. */
    private String type = "ORDER_STATUS_UPDATE";

    private String orderId;
    private String restaurantName;

    /** CONFIRMED | PREPARING | READY | DELIVERED | CANCELLED */
    private String newStatus;

    /** Human-readable message e.g. "🎉 Delivered! Tap to rate Spice Garden ⭐" */
    private String message;

    private boolean read = false;

    @CreatedDate
    private LocalDateTime createdAt;
}
