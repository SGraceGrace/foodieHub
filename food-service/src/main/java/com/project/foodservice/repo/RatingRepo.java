package com.project.foodservice.repo;

import com.project.foodservice.document.Rating;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RatingRepo extends MongoRepository<Rating, String> {

    /** All ratings for a restaurant — used to recalculate avg on every new rating. */
    List<Rating> findByRestaurantId(String restaurantId);

    /** Guard against duplicate orderId at application level (DB index is the real guard). */
    boolean existsByOrderId(String orderId);
}
