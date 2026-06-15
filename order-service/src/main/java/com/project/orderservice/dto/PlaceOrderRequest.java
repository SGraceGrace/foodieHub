package com.project.orderservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PlaceOrderRequest {

    @NotBlank(message = "restaurantId is required")
    private String restaurantId;

    @NotBlank(message = "deliveryAddress is required")
    private String deliveryAddress;

    /** Customer's display name — sent from Angular profile state */
    private String customerName;

    /** Razorpay payment ID — set when order is paid via gateway; null for COD */
    private String paymentId;

    private String couponCode;
    private double discountAmount;
}
