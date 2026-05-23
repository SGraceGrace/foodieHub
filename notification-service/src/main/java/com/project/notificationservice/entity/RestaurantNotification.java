package com.project.notificationservice.entity;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Stores per-restaurant order notifications in MongoDB.
 * Consumed by the partner workspace notification bell.
 */
@Document(collection = "restaurant_notifications")
@Data
public class RestaurantNotification {

    @Id
    private String id;

    private String restaurantId;

    /** e.g. NEW_ORDER */
    private String type;

    private String orderId;
    private String customerName;
    private String deliveryAddress;
    private List<String> itemNames;
    private double totalAmount;

    private boolean read = false;

    @CreatedDate
    private LocalDateTime createdAt;
}
