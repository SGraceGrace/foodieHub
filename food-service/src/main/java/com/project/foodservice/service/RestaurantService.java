package com.project.foodservice.service;

import com.project.foodservice.document.Restaurant;
import com.project.foodservice.dto.PaginatedResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface RestaurantService {
    PaginatedResponse<Restaurant> getAll(String cuisine, Pageable pageable);
    Restaurant getById(String id);
    List<String> getCuisines();
}
