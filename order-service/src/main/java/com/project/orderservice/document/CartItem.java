package com.project.orderservice.document;

import lombok.Data;

@Data
public class CartItem {
    /** ID from food-service menu_items collection — carried through to OrderItem for analytics. */
    private String menuItemId;
    private String name;
    private double price;
    private int qty;
    private boolean isVeg;
    private String description;
    private String imageUrl;
}
