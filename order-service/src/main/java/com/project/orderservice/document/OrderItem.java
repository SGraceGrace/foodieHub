package com.project.orderservice.document;

import lombok.Data;

@Data
public class OrderItem {
    private String name;
    private double price;
    private int qty;
    private boolean isVeg;
}
