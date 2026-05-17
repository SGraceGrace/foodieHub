package com.project.foodieHub.messaging;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OwnerStatusEvent {
    private String ownerEmail;
    private String ownerName;
    private String restaurantName;
    private String status; // "APPROVED" or "REJECTED"
}
