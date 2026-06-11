package com.project.foodservice.document;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "wishlists")
@CompoundIndex(def = "{'userId': 1, 'restaurantId': 1}", unique = true)
@Data
public class Wishlist {

    @Id
    private String id;

    private String userId;        // customer email from X-User-Id header
    private String restaurantId;

    @CreatedDate
    private LocalDateTime addedAt;
}
