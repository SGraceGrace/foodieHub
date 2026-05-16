package com.project.foodieHub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserAddressRequestDTO {

    @NotBlank(message = "Label cannot be blank")
    private String label;

    @NotBlank(message = "Address cannot be blank")
    private String addressText;

    private String landmark;

    private boolean defaultAddress;
}
