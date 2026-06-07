package com.project.foodservice.document;

import lombok.Data;

import java.util.List;

@Data
public class MenuItem {
    /** Populated when built from the menu_items collection — sent back to Angular so the cart can include it. */
    private String id;
    private String name;
    private double price;
    private int gstPercent;
    private boolean isVeg;
    private boolean available = true;
    private String description;
    private String imageUrl;
    private List<MenuExtra> extras;
}
