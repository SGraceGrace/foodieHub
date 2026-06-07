package com.project.foodservice.messaging;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Mirror of com.project.orderservice.messaging.OrderPlacedEvent.
 * food-service needs its own copy because there is no shared-library module in this POC.
 * Must stay in sync with the order-service version — same field names, same types.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderPlacedEvent {
    private String orderId;
    private String userId;
    private String customerEmail;
    private String customerName;
    private String restaurantId;
    private String restaurantName;
    private double totalAmount;

    /** Full item list with menuItemId — used to increment order counts in menu_items. */
    private List<OrderItemEvent> items;

    /** Kept for backward compat (notification-service email). */
    private List<String> itemNames;

    private String deliveryAddress;
    private LocalDateTime placedAt;
}
