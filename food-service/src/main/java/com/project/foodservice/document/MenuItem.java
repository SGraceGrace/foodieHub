package com.project.foodservice.document;

import lombok.Data;

@Data
public class MenuItem {
    private String name;
    private double price;
    private boolean isVeg;
    private boolean available = true;
    private String description;
}
