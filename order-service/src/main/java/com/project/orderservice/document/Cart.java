package com.project.orderservice.document;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "carts")
@Data
public class Cart {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    private List<RestaurantCart> restaurants = new ArrayList<>();

    private LocalDateTime updatedAt = LocalDateTime.now();
}
