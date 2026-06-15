package com.project.orderservice.document;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "coupons")
@Data
public class Coupon {

    @Id
    private String id;

    @Indexed(unique = true)
    private String code;           // uppercase, e.g. SAVE50

    private String description;    // shown on the deals page

    /** PERCENTAGE or FLAT */
    private String discountType;

    private double discountValue;  // 20 means 20% or ₹20

    private double minOrderAmount; // minimum subtotal to apply

    /** Cap for PERCENTAGE discounts. 0 = no cap. */
    private double maxDiscount;

    private LocalDateTime expiresAt;
    private boolean active = true;

    /** 0 = unlimited */
    private int usageLimit;
    private int usedCount;
}
