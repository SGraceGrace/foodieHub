package com.project.orderservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyPaymentRequest {

    // ── From Razorpay callback ────────────────────────────────────────
    @NotBlank private String razorpayOrderId;
    @NotBlank private String razorpayPaymentId;
    @NotBlank private String razorpaySignature;

    // ── Order details (sent alongside the payment callback) ───────────
    @NotBlank private String restaurantId;
    @NotBlank private String deliveryAddress;
    private String customerName;
}
