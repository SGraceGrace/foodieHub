package com.project.orderservice.messaging;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderPlacedEvent {
    private String orderId;
    private String userId;
    private String customerEmail;
    private String customerName;
    private String restaurantId;
    private String restaurantName;
    private double totalAmount;
    private List<String> itemNames;
    private String deliveryAddress;
    private LocalDateTime placedAt;
}
