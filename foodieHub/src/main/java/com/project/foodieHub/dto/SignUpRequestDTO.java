package com.project.foodieHub.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SignUpRequestDTO {

    @NotNull(message = "name cannot be null")
    private String name;

    @NotNull(message = "email cannot be null")
    private String email;

    @NotNull(message = "username cannot be null")
    private String username;

    @NotNull(message = "password cannot be null")
    private String password;

    @NotNull(message = "deviceId cannot be null")
    private String deviceId;
}
