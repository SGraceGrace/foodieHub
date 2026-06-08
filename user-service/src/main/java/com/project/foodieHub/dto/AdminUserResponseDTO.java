package com.project.foodieHub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDateTime;

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
    private LocationDTO restaurantLocation;
    private String fssaiNumber;
    private String gstNumber;
    private String vehicleType;
    private String licenseNumber;
    // Driver-specific fields
    private String bankAccount;
    private Boolean online;
    private LocalDateTime lastLocationAt;
    private LocalDateTime joinedAt;
}
