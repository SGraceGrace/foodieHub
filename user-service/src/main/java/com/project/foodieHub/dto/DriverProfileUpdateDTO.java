package com.project.foodieHub.dto;

import lombok.Data;

@Data
public class DriverProfileUpdateDTO {
    private String firstName;
    private String lastName;
    private String phone;
    private String vehicleType;
    private String licenseNumber;
    private String bankAccount;
}
