package com.project.orderservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CouponValidateResponse {
    private boolean valid;
    private double discountAmount;
    private String message;
}
