package com.project.foodservice.service.impl;

import com.project.foodservice.document.Restaurant;
import com.project.foodservice.dto.PaginatedResponse;
import com.project.foodservice.dto.RestaurantCreateRequestDTO;
import com.project.foodservice.enums.RestaurantStatus;
import com.project.foodservice.repo.RestaurantRepo;
import com.project.foodservice.service.RestaurantService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class RestaurantServiceImpl implements RestaurantService {

    private final RestaurantRepo restaurantRepo;

    @Override
    public PaginatedResponse<Restaurant> getAll(String cuisine, Pageable pageable) {
        if (cuisine != null && !cuisine.isBlank()) {
            return PaginatedResponse.of(
                restaurantRepo.findByStatusAndCuisineContainingIgnoreCase(RestaurantStatus.ACTIVE, cuisine, pageable)
            );
        }
        return PaginatedResponse.of(restaurantRepo.findByStatus(RestaurantStatus.ACTIVE, pageable));
    }

    @Override
    public Restaurant getById(String id) {
        return restaurantRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));
    }

    @Override
    public List<String> getCuisines() {
        return restaurantRepo.findAllCuisineFields().stream()
                .filter(r -> r.getCuisine() != null)
                .flatMap(r -> r.getCuisine().stream())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    @Override
    public Restaurant create(RestaurantCreateRequestDTO request) {
        Restaurant restaurant = new Restaurant();
        restaurant.setName(request.getName());
        restaurant.setOwnerId(request.getOwnerId());
        return restaurantRepo.save(restaurant);
    }

    @Override
    public PaginatedResponse<Restaurant> getByOwner(String ownerId, Pageable pageable) {
        return PaginatedResponse.of(restaurantRepo.findByOwnerId(ownerId, pageable));
    }

    @Override
    public void updateStatusByOwnerId(String ownerId, RestaurantStatus status) {
        List<Restaurant> restaurants = restaurantRepo.findByOwnerId(ownerId);
        restaurants.forEach(r -> r.setStatus(status));
        restaurantRepo.saveAll(restaurants);
    }
}
