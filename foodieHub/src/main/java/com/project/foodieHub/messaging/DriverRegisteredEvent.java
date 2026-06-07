package com.project.foodieHub.messaging;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DriverRegisteredEvent {
    private String driverName;
    private String email;
    private String phone;
    private String vehicleType;
    private String licenseNumber;
}
