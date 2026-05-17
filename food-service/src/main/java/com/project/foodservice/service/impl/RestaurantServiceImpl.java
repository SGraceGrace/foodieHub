package com.project.foodservice.service.impl;

import com.project.foodservice.document.Restaurant;
import com.project.foodservice.repo.RestaurantRepo;
import com.project.foodservice.service.RestaurantService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RestaurantServiceImpl implements RestaurantService {

    private final RestaurantRepo restaurantRepo;

    @Override
    public List<Restaurant> getAll(String cuisine) {
        if (cuisine != null && !cuisine.isBlank()) {
            return restaurantRepo.findByCuisineContainingIgnoreCase(cuisine);
        }
        return restaurantRepo.findAll();
    }

    @Override
    public Restaurant getById(String id) {
        return restaurantRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));
    }

    @Override
    public List<String> getCuisines() {
        return restaurantRepo.findAllCuisineFields().stream()
                .flatMap(r -> r.getCuisine().stream())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }
}
