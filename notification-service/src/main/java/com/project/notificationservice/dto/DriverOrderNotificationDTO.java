package com.project.notificationservice.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Sent over SSE and stored in driver_notifications.
 * Shape matches DriverNotification — both SSE and history GET return the same record.
 */
public record DriverOrderNotificationDTO(
        String id,              // MongoDB document id
        String orderId,
        String restaurantName,
        String deliveryAddress,
        int itemCount,
        double earnAmount,
        List<String> itemNames,
        boolean read,
        LocalDateTime createdAt
) {}
