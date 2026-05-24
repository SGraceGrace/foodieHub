package com.project.foodservice.service;

import com.project.foodservice.document.Restaurant;
import com.project.foodservice.dto.PaginatedResponse;
import com.project.foodservice.dto.RestaurantCreateRequestDTO;
import com.project.foodservice.dto.RestaurantUpdateRequestDTO;
import com.project.foodservice.enums.RestaurantStatus;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface RestaurantService {
    PaginatedResponse<Restaurant> getAll(String cuisine, Double lat, Double lng, Double radiusKm, String sort, Pageable pageable);
    Restaurant getById(String id);
    List<String> getCuisines();
    Restaurant create(RestaurantCreateRequestDTO request);
    PaginatedResponse<Restaurant> getByOwner(String ownerId, Pageable pageable);
    void updateStatusByOwnerId(String ownerId, RestaurantStatus status);
    PaginatedResponse<Restaurant> getAllForAdmin(String status, String cuisine, Pageable pageable);
    Restaurant updateHours(String id, java.util.List<com.project.foodservice.document.DaySchedule> hours);
    Restaurant updateDetails(String id, RestaurantUpdateRequestDTO request);

    /**
     * Records a rating for the given order and recalculates the restaurant's avg.
     * Throws if orderId has already been rated (duplicate guard).
     */
    Restaurant addRating(String restaurantId, double rating, String customerId, String orderId);
}
