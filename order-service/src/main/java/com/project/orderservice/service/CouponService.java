package com.project.orderservice.service;

import com.project.orderservice.document.Coupon;
import com.project.orderservice.dto.CreateCouponRequest;
import com.project.orderservice.dto.CouponValidateResponse;

import java.util.List;

public interface CouponService {

    List<Coupon> getActiveCoupons();

    CouponValidateResponse validate(String code, double orderAmount);

    Coupon create(CreateCouponRequest req);

    List<Coupon> getAllForAdmin();
}
