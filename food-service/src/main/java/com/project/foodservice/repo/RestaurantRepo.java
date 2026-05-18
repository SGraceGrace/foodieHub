package com.project.foodservice.repo;

import com.project.foodservice.document.Restaurant;
import com.project.foodservice.enums.RestaurantStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface RestaurantRepo extends MongoRepository<Restaurant, String> {
    Page<Restaurant> findByStatus(RestaurantStatus status, Pageable pageable);

    Page<Restaurant> findByStatusAndCuisineContainingIgnoreCase(RestaurantStatus status, String cuisine, Pageable pageable);

    @Query(value = "{ 'status': 'ACTIVE' }", fields = "{ 'cuisine': 1 }")
    List<Restaurant> findAllCuisineFields();

    Page<Restaurant> findByOwnerId(String ownerId, Pageable pageable);

    List<Restaurant> findByOwnerId(String ownerId);
}
