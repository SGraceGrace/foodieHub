package com.project.notificationservice.dto;

import java.time.LocalDateTime;

/**
 * Sent over SSE to a customer when their order status changes.
 */
public record CustomerOrderUpdateDTO(
        String orderId,
        String restaurantName,
        String newStatus,
        String message,         // human-readable e.g. "Your order is being prepared! 🍳"
        LocalDateTime updatedAt
) {}
