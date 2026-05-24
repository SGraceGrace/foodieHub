package com.project.foodservice.dto;

/**
 * Request body for POST /api/v1/restaurants/{id}/rating
 * orderId ties the rating to a specific order — unique index prevents duplicates.
 */
public record RatingRequest(double rating, String orderId) {}
