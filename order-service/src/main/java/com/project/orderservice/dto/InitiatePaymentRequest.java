package com.project.orderservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InitiatePaymentRequest {

    @NotBlank(message = "restaurantId is required")
    private String restaurantId;
}
