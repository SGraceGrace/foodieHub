package com.project.orderservice.service.impl;

import com.project.orderservice.document.Coupon;
import com.project.orderservice.dto.CreateCouponRequest;
import com.project.orderservice.dto.CouponValidateResponse;
import com.project.orderservice.repo.CouponRepository;
import com.project.orderservice.service.CouponService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CouponServiceImpl implements CouponService {

    private final CouponRepository couponRepository;

    @Override
    public List<Coupon> getActiveCoupons() {
        return couponRepository.findByActiveTrueAndExpiresAtAfter(LocalDateTime.now());
    }

    @Override
    public CouponValidateResponse validate(String code, double orderAmount) {
        Coupon coupon = couponRepository.findByCodeIgnoreCase(code)
                .orElse(null);

        if (coupon == null)
            return new CouponValidateResponse(false, 0, "Invalid coupon code");

        if (!coupon.isActive())
            return new CouponValidateResponse(false, 0, "This coupon is no longer active");

        if (coupon.getExpiresAt().isBefore(LocalDateTime.now()))
            return new CouponValidateResponse(false, 0, "This coupon has expired");

        if (coupon.getUsageLimit() > 0 && coupon.getUsedCount() >= coupon.getUsageLimit())
            return new CouponValidateResponse(false, 0, "This coupon has reached its usage limit");

        if (orderAmount < coupon.getMinOrderAmount())
            return new CouponValidateResponse(false, 0,
                    "Minimum order amount of ₹" + (int) coupon.getMinOrderAmount() + " required");

        double discount = calculateDiscount(coupon, orderAmount);
        return new CouponValidateResponse(true, discount,
                "Coupon applied! You save ₹" + (int) discount);
    }

    @Override
    public Coupon create(CreateCouponRequest req) {
        if (couponRepository.findByCodeIgnoreCase(req.getCode()).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Coupon code already exists");

        Coupon coupon = new Coupon();
        coupon.setCode(req.getCode().toUpperCase());
        coupon.setDescription(req.getDescription());
        coupon.setDiscountType(req.getDiscountType());
        coupon.setDiscountValue(req.getDiscountValue());
        coupon.setMinOrderAmount(req.getMinOrderAmount());
        coupon.setMaxDiscount(req.getMaxDiscount());
        coupon.setExpiresAt(req.getExpiresAt());
        coupon.setUsageLimit(req.getUsageLimit());
        coupon.setActive(true);
        return couponRepository.save(coupon);
    }

    @Override
    public List<Coupon> getAllForAdmin() {
        return couponRepository.findAll();
    }

    // ── helpers ───────────────────────────────────────────────────────

    public double calculateDiscount(Coupon coupon, double orderAmount) {
        if ("PERCENTAGE".equals(coupon.getDiscountType())) {
            double raw = orderAmount * coupon.getDiscountValue() / 100.0;
            return coupon.getMaxDiscount() > 0 ? Math.min(raw, coupon.getMaxDiscount()) : raw;
        }
        return Math.min(coupon.getDiscountValue(), orderAmount);
    }

    /** Called by PaymentServiceImpl after successful payment to increment usedCount. */
    public void incrementUsage(String code) {
        couponRepository.findByCodeIgnoreCase(code).ifPresent(c -> {
            c.setUsedCount(c.getUsedCount() + 1);
            couponRepository.save(c);
        });
    }
}
