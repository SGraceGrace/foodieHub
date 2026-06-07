package com.project.orderservice.messaging;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderCancelledEvent {
    private String orderId;
    private String userId;          // customer email
    private String customerEmail;
    private String customerName;
    private String restaurantName;
    private String paymentId;       // Razorpay paymentId — present only for paid orders
    private double totalAmount;
    private LocalDateTime cancelledAt;
}
