package com.project.orderservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RemoveFromCartRequest {

    @NotBlank(message = "restaurantId is required")
    private String restaurantId;

    @NotBlank(message = "item name is required")
    private String name;
}
