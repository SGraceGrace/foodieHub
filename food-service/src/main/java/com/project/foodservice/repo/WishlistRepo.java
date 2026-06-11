package com.project.foodservice.repo;

import com.project.foodservice.document.Wishlist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WishlistRepo extends MongoRepository<Wishlist, String> {
    Page<Wishlist> findByUserId(String userId, Pageable pageable);
    boolean existsByUserIdAndRestaurantId(String userId, String restaurantId);
    void deleteByUserIdAndRestaurantId(String userId, String restaurantId);
}
