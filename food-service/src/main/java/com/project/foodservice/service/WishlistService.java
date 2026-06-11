package com.project.foodservice.service;

import com.project.foodservice.dto.PaginatedResponse;
import com.project.foodservice.document.Restaurant;

public interface WishlistService {
    PaginatedResponse<Restaurant> getWishlist(String userId, int page, int size);
    void add(String userId, String restaurantId);
    void remove(String userId, String restaurantId);
    boolean isSaved(String userId, String restaurantId);
}
