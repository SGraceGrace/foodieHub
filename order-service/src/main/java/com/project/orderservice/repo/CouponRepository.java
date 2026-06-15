package com.project.orderservice.repo;

import com.project.orderservice.document.Coupon;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CouponRepository extends MongoRepository<Coupon, String> {

    Optional<Coupon> findByCodeIgnoreCase(String code);

    List<Coupon> findByActiveTrueAndExpiresAtAfter(LocalDateTime now);
}
