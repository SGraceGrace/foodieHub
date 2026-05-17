package com.project.foodservice.service;

import com.project.foodservice.document.Restaurant;

import java.util.List;

public interface RestaurantService {
    List<Restaurant> getAll(String cuisine);
    Restaurant getById(String id);
    List<String> getCuisines();
}
