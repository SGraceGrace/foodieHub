package com.project.foodieHub.dto;

import lombok.Data;

@Data
public class SignUpRequestDTO {
    private String name;
    private String email;
    private String username;
    private String password;
}
