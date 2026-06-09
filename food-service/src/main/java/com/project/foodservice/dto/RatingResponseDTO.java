package com.project.foodservice.dto;

import java.time.LocalDateTime;

public record RatingResponseDTO(
        String id,
        String restaurantId,
        String restaurantName,
        String restaurantImageUrl,
        String orderId,
        double rating,
        Integer driverRating,
        LocalDateTime createdAt
) {}
