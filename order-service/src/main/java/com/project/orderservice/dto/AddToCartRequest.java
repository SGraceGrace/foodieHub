package com.project.orderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class AddToCartRequest {

    @NotBlank(message = "restaurantId is required")
    private String restaurantId;

    @NotBlank(message = "restaurantName is required")
    private String restaurantName;

    @NotBlank(message = "item name is required")
    private String name;

    @NotNull(message = "price is required")
    @Positive(message = "price must be positive")
    private Double price;

    private boolean isVeg;
    private String description;
    private String imageUrl;
}
