package com.project.notificationservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderCancelledEvent {
    private String orderId;
    private String userId;
    private String customerEmail;
    private String customerName;
    private String restaurantName;
    private String paymentId;
    private double totalAmount;
    private LocalDateTime cancelledAt;
}
