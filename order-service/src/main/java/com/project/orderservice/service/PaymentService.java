package com.project.orderservice.service;

import com.project.orderservice.document.Order;
import com.project.orderservice.dto.InitiatePaymentRequest;
import com.project.orderservice.dto.InitiatePaymentResponse;
import com.project.orderservice.dto.VerifyPaymentRequest;

public interface PaymentService {

    /** Creates a Razorpay order and returns the checkout details for the frontend. */
    InitiatePaymentResponse initiatePayment(String userId, InitiatePaymentRequest req);

    /** Verifies Razorpay HMAC signature, then places the food order. */
    Order verifyAndPlace(String userId, VerifyPaymentRequest req);
}
