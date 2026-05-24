package com.project.foodservice.messaging;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One item within an OrderPlacedEvent — mirrors com.project.orderservice.messaging.OrderItemEvent.
 * menuItemId links back to the menu_items collection for order-count tracking.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemEvent {
    private String menuItemId;   // null-safe: items added before migration won't have this
    private String name;
    private int qty;
    private double price;
}
