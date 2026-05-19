package com.project.foodieHub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminUserResponseDTO {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String roleName;
    private String status;
    private String restaurantName;
    private String restaurantAddress;
    private String fssaiNumber;
    private String gstNumber;
    private String vehicleType;
    private String licenseNumber;
}
