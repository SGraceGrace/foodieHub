package com.project.orderservice.document;

import lombok.Data;

@Data
public class OrderItem {
    /** Links back to food-service menu_items collection for order-count tracking. Null for pre-migration orders. */
    private String menuItemId;
    private String name;
    private double price;
    private int qty;
    private boolean isVeg;
}
