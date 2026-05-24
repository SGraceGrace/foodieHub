package com.project.notificationservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One item in an OrderPlacedEvent.
 * notification-service doesn't use this directly but needs the class
 * so Jackson can deserialize the enriched event without errors.
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
