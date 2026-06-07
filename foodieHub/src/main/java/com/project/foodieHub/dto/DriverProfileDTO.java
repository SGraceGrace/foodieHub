package com.project.foodieHub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DriverProfileDTO {
    private String firstName;
    private String lastName;
    private String phone;
    private String email;
    private String vehicleType;
    private String licenseNumber;
    private String bankAccount;
    private String status;
    private boolean online;
}
