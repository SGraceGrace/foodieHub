package com.project.notificationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantNotificationDTO {
    private String id;
    private String restaurantId;
    private String type;
    private String orderId;
    private String customerName;
    private String deliveryAddress;
    private List<String> itemNames;
    private double totalAmount;
    private boolean read;
    private LocalDateTime createdAt;
}
