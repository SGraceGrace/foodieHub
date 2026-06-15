package com.project.orderservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateCouponRequest {

    @NotBlank
    private String code;

    @NotBlank
    private String description;

    @NotBlank
    private String discountType;   // PERCENTAGE or FLAT

    @Min(1)
    private double discountValue;

    private double minOrderAmount;
    private double maxDiscount;    // 0 = no cap (for PERCENTAGE)

    @NotNull
    private LocalDateTime expiresAt;

    private int usageLimit;        // 0 = unlimited
}
