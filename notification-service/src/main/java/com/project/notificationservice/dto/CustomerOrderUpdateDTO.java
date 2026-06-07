package com.project.notificationservice.dto;

import java.time.LocalDateTime;

/**
 * Unified shape for customer order-status notifications.
 *
 * Used in TWO places:
 *  1. SSE push  — sent over the stream when an order status changes (real-time)
 *  2. REST GET  — returned by GET /api/v1/customer/notifications (history on page load)
 *
 * Both paths return the same record so the Angular model needs no conversion.
 */
public record CustomerOrderUpdateDTO(
        String id,               // MongoDB document id — lets Angular deduplicate DB + SSE
        String orderId,
        String restaurantName,
        String newStatus,        // the order status that triggered this notification
        String message,
        LocalDateTime createdAt,
        boolean read             // false for fresh SSE pushes; from DB for REST history
) {}
