package com.project.foodservice.document;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * One rating per order — unique index on orderId enforced at DB level.
 * The restaurant's avg rating + ratingCount are recalculated from this
 * collection every time a new rating is submitted.
 */
@Document(collection = "ratings")
@Data
public class Rating {

    @Id
    private String id;

    private String restaurantId;
    private String customerId;    // customer email from X-User-Id header (set by gateway)

    /** Unique — one rating per order, prevents any duplicate regardless of how the API is called. */
    @Indexed(unique = true)
    private String orderId;

    private double rating;          // 1–5 restaurant stars

    /** Email of the driver who delivered this order. Null if no driver was assigned. */
    private String driverEmail;

    /** Customer's 1–5 rating for the delivery driver. Null if no driver or customer skipped. */
    private Integer driverRating;

    @CreatedDate
    private LocalDateTime createdAt;
}
