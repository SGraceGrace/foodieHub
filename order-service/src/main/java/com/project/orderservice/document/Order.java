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

    /** Overall order lifecycle: PLACED → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED | CANCELLED */
    private String status = "PLACED";

    /** Last status set by the restaurant: CONFIRMED | PREPARING | READY | CANCELLED */
    private String restaurantStatus;

    /** Last status set by the driver: OUT_FOR_DELIVERY | DELIVERED */
    private String driverStatus;

    /**
     * Restaurant's earnings for this order — frozen at placement time.
     * Equals subtotal (food value only). The restaurant does not keep the delivery fee or GST.
     */
    private Double restaurantEarnings;

    /** Email of the driver who accepted this order. Null until a driver claims it. */
    private String driverEmail;

    /**
     * Driver's earnings for this order — frozen at acceptance time (15% of totalAmount).
     * Stored so historical earnings are accurate even if the commission rate changes later.
     * Null until a driver claims the order.
     */
    private Double driverEarnings;

    /** True after the customer has submitted a star rating. Prevents duplicate ratings. */
    private boolean rated = false;

    /** Customer's rating for the driver (1-5). Null if no driver was assigned or not yet rated. */
    private Integer driverRating;

    /** Razorpay payment ID — null means COD / not yet paid */
    private String paymentId;

    /** PAID | PENDING | null (for COD) */
    private String paymentStatus;

    @CreatedDate
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
