package com.project.notificationservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

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

    /** Added by food-service migration — notification-service ignores this, but must not fail to deserialize it. */
    private List<OrderItemEvent> items;

    /** Used for the order confirmation email — populated by order-service. */
    private List<String> itemNames;

    private String deliveryAddress;
    private LocalDateTime placedAt;
}
