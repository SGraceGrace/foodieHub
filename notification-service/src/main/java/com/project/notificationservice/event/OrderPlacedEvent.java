package com.project.notificationservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderPlacedEvent {
    private String orderId;
    private String customerEmail;
    private String customerName;
    private String restaurantName;
    private double totalAmount;
    private List<String> itemNames;
}
