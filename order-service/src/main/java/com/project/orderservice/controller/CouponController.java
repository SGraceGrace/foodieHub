package com.project.orderservice.controller;

import com.project.orderservice.dto.BaseAPIResponse;
import com.project.orderservice.dto.CreateCouponRequest;
import com.project.orderservice.dto.CouponValidateRequest;
import com.project.orderservice.service.CouponService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class CouponController {

    private final CouponService couponService;

    /** Public — deals page lists all active coupons. No auth needed. */
    @GetMapping("/api/v1/coupons/active")
    public ResponseEntity<BaseAPIResponse> getActiveCoupons() {
        return ResponseEntity.ok(new BaseAPIResponse("ok", couponService.getActiveCoupons(), 200, null));
    }

    /** Customer — validate a coupon code at checkout. */
    @PreAuthorize("hasRole('CUSTOMER')")
    @PostMapping("/api/v1/coupons/validate")
    public ResponseEntity<BaseAPIResponse> validate(@Valid @RequestBody CouponValidateRequest req) {
        return ResponseEntity.ok(new BaseAPIResponse("ok",
                couponService.validate(req.getCode(), req.getOrderAmount()), 200, null));
    }

    /** Admin — create a new coupon. */
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @PostMapping("/api/v1/admin/coupons")
    public ResponseEntity<BaseAPIResponse> create(@Valid @RequestBody CreateCouponRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BaseAPIResponse("Coupon created", couponService.create(req), 201, null));
    }

    /** Admin — list all coupons. */
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @GetMapping("/api/v1/admin/coupons")
    public ResponseEntity<BaseAPIResponse> getAll() {
        return ResponseEntity.ok(new BaseAPIResponse("ok", couponService.getAllForAdmin(), 200, null));
    }
}
