package com.project.orderservice.messaging;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One item in an OrderPlacedEvent.
 * menuItemId links back to food-service's menu_items collection so order counts can be incremented.
 * May be null for items added before the migration (backward compat).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemEvent {
    private String menuItemId;
    private String name;
    private int qty;
    private double price;
}
