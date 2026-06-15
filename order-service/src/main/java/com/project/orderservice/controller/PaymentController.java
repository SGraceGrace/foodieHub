package com.project.orderservice.controller;

import com.project.orderservice.document.Order;
import com.project.orderservice.dto.BaseAPIResponse;
import com.project.orderservice.dto.InitiatePaymentRequest;
import com.project.orderservice.dto.InitiatePaymentResponse;
import com.project.orderservice.dto.VerifyPaymentRequest;
import com.project.orderservice.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@PreAuthorize("hasRole('END_USERS')")
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * POST /api/v1/payments/initiate
     * Reads cart, calculates amount, creates a Razorpay order.
     * Returns razorpayOrderId + keyId + amount so Angular can open the checkout modal.
     */
    @PostMapping("/initiate")
    public ResponseEntity<BaseAPIResponse> initiate(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody InitiatePaymentRequest req) {

        InitiatePaymentResponse resp = paymentService.initiatePayment(userId, req);
        return ResponseEntity.ok(new BaseAPIResponse("PAYMENT_INITIATED", resp, 200, null));
    }

    /**
     * POST /api/v1/payments/verify
     * Verifies Razorpay HMAC signature, then places the food order (clears cart + fires RabbitMQ).
     * Returns the created Order — Angular navigates to /user/order-confirm/{id}.
     */
    @PostMapping("/verify")
    public ResponseEntity<BaseAPIResponse> verify(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody VerifyPaymentRequest req) {

        Order order = paymentService.verifyAndPlace(userId, req);
        return ResponseEntity.ok(new BaseAPIResponse("PAYMENT_VERIFIED", order, 200, null));
    }
}
