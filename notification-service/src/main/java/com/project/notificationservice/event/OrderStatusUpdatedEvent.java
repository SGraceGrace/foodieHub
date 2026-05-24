package com.project.notificationservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Mirrors com.project.orderservice.messaging.OrderStatusUpdatedEvent.
 * Received when the restaurant partner changes an order status
 * (CONFIRMED / PREPARING / READY / DELIVERED / CANCELLED).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusUpdatedEvent {
    private String orderId;
    private String userId;          // customer identifier — used to route SSE
    private String customerName;
    private String restaurantName;
    private String newStatus;
    private LocalDateTime updatedAt;
}
