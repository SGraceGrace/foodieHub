package com.project.orderservice.document;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class RestaurantCart {
    private String restaurantId;
    private String restaurantName;
    private List<CartItem> items = new ArrayList<>();
}
