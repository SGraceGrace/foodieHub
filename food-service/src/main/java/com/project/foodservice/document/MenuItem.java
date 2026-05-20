package com.project.foodservice.document;

import lombok.Data;

import java.util.List;

@Data
public class MenuItem {
    private String name;
    private double price;
    private int gstPercent;
    private boolean isVeg;
    private boolean available = true;
    private String description;
    private String imageUrl;
    private List<MenuExtra> extras;
}
