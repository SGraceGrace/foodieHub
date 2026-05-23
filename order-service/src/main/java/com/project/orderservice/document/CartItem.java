package com.project.orderservice.document;

import lombok.Data;

@Data
public class CartItem {
    private String name;
    private double price;
    private int qty;
    private boolean isVeg;
    private String description;
    private String imageUrl;
}
