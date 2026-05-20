package com.project.foodservice.service;

import com.project.foodservice.document.Restaurant;
import com.project.foodservice.dto.PaginatedResponse;
import com.project.foodservice.dto.RestaurantCreateRequestDTO;
import com.project.foodservice.dto.RestaurantUpdateRequestDTO;
import com.project.foodservice.enums.RestaurantStatus;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface RestaurantService {
    PaginatedResponse<Restaurant> getAll(String cuisine, Double lat, Double lng, Double radiusKm, Pageable pageable);
    Restaurant getById(String id);
    List<String> getCuisines();
    Restaurant create(RestaurantCreateRequestDTO request);
    PaginatedResponse<Restaurant> getByOwner(String ownerId, Pageable pageable);
    void updateStatusByOwnerId(String ownerId, RestaurantStatus status);
    PaginatedResponse<Restaurant> getAllForAdmin(String status, String cuisine, Pageable pageable);
    Restaurant updateHours(String id, java.util.List<com.project.foodservice.document.DaySchedule> hours);
    Restaurant updateMenu(String id, java.util.List<com.project.foodservice.document.MenuCategory> menu);
    Restaurant updateDetails(String id, RestaurantUpdateRequestDTO request);
}
