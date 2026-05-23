package com.project.orderservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InitiatePaymentResponse {

    /** Razorpay order ID (e.g. order_XXXXXXXXXXXXXX) */
    private String razorpayOrderId;

    /** Amount in paise (1 INR = 100 paise) */
    private int amount;

    private String currency;

    /** Public key sent to frontend to init Razorpay checkout */
    private String keyId;
}
