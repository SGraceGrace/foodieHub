package com.project.notificationservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PartnerRegisteredEvent {
    private String ownerName;
    private String email;
    private String phone;
    private String restaurantName;
    private String restaurantAddress;
    private String fssaiNumber;
    private String gstNumber;
}
