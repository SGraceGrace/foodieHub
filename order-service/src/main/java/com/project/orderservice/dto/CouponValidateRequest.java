package com.project.orderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CouponValidateRequest {

    @NotBlank
    private String code;

    @Positive
    private double orderAmount;
}
