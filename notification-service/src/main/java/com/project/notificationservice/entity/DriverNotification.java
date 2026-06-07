package com.project.notificationservice.entity;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Stores per-driver "new order available" notifications in MongoDB.
 * Collection: driver_notifications
 *
 * Each online driver gets their own document for every order event so the
 * notification bell shows an individual history (same hard-delete pattern as
 * customer and restaurant — no dismiss / soft-delete).
 */
@Document(collection = "driver_notifications")
@Data
public class DriverNotification {

    @Id
    private String id;

    /** Driver's email — same as X-User-Id from JWT. */
    private String driverEmail;

    /** Always NEW_ORDER for now. */
    private String type = "NEW_ORDER";

    private String orderId;
    private String restaurantName;
    private String deliveryAddress;

    /** Derived from itemNames.size() for display. */
    private int itemCount;

    /** Estimated earn (15% of order total — POC approximation). */
    private double earnAmount;

    private List<String> itemNames;

    private boolean read = false;

    @CreatedDate
    private LocalDateTime createdAt;
}
