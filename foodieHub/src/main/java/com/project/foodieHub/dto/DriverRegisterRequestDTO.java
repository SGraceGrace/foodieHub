package com.project.foodieHub.dto;

import lombok.Data;

@Data
public class DriverRegisterRequestDTO {
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private String phone;
    private String vehicleType;
    private String licenseNumber;
    private String bankAccount;
}
