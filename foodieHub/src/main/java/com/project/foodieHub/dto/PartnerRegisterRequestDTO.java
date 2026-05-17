package com.project.foodieHub.dto;

import lombok.Data;

@Data
public class PartnerRegisterRequestDTO {
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private String phone;
    private String restaurantName;
}
