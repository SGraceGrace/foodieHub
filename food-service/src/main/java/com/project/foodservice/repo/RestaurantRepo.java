package com.project.foodservice.repo;

import com.project.foodservice.document.Restaurant;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface RestaurantRepo extends MongoRepository<Restaurant, String> {
    List<Restaurant> findByCuisineContainingIgnoreCase(String cuisine);

    @Query(value = "{}", fields = "{ 'cuisine': 1 }")
    List<Restaurant> findAllCuisineFields();
}
