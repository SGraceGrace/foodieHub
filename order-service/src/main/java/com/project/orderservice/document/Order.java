package com.project.orderservice.document;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "orders")
@Data
public class Order {

    @Id
    private String id;

    private String userId;          // customer email (from X-User-Id header)
    private String customerName;

    private String restaurantId;
    private String restaurantName;

    private List<OrderItem> items;

    private double subtotal;
    private double deliveryFee;
    private double gst;
    private double totalAmount;

    private String deliveryAddress;

    /** PLACED → CONFIRMED → PREPARING → READY → DELIVERED | CANCELLED */
    private String status = "PLACED";

    /** True after the customer has submitted a star rating. Prevents duplicate ratings. */
    private boolean rated = false;

    /** Razorpay payment ID — null means COD / not yet paid */
    private String paymentId;

    /** PAID | PENDING | null (for COD) */
    private String paymentStatus;

    @CreatedDate
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
