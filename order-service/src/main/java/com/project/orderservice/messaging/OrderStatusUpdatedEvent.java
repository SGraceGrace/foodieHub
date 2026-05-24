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
public class OrderStatusUpdatedEvent {
    private String orderId;
    private String userId;          // customer's userId / email — used to route SSE
    private String customerName;
    private String restaurantName;
    private String newStatus;
    private LocalDateTime updatedAt;
}
