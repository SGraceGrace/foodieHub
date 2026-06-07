package com.project.orderservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateStatusRequest {

    /** CONFIRMED | PREPARING | READY | DELIVERED | CANCELLED */
    @NotBlank(message = "status is required")
    private String status;
}
