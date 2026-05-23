package com.project.orderservice.repo;

import com.project.orderservice.document.Order;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface OrderRepository extends MongoRepository<Order, String> {

    List<Order> findByUserIdOrderByCreatedAtDesc(String userId);

    /** All orders for a restaurant filtered by status — used by partner Live Orders tab */
    List<Order> findByRestaurantIdAndStatusInOrderByCreatedAtDesc(
            String restaurantId, List<String> statuses);

    /** All orders for a restaurant regardless of status */
    List<Order> findByRestaurantIdOrderByCreatedAtDesc(String restaurantId);
}
