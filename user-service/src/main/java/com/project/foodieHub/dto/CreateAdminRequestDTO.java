package com.project.foodieHub.dto;

import lombok.Data;

@Data
public class CreateAdminRequestDTO {
    private String firstName;
    private String lastName;
    private String email;
    private String password;
}
