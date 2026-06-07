package com.project.foodservice.repo;

import com.project.foodservice.document.MenuItemDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface MenuItemRepo extends MongoRepository<MenuItemDocument, String> {

    /** All items for a restaurant, sorted by category — used to build the grouped menu response. */
    List<MenuItemDocument> findByRestaurantIdOrderByCategory(String restaurantId);

    List<MenuItemDocument> findByRestaurantIdAndCategory(String restaurantId, String category);

    /** Used to validate ownership before update/delete. */
    Optional<MenuItemDocument> findByIdAndRestaurantId(String id, String restaurantId);

    /** Used by the batch-save (saveFullMenu) and migration rollback. */
    void deleteByRestaurantId(String restaurantId);

    /** Top performers for partner analytics dashboard. */
    List<MenuItemDocument> findTop5ByRestaurantIdOrderByOrderCountDesc(String restaurantId);
}
