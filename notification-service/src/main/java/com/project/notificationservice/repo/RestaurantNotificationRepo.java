package com.project.notificationservice.repo;

import com.project.notificationservice.entity.RestaurantNotification;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RestaurantNotificationRepo extends MongoRepository<RestaurantNotification, String> {

    List<RestaurantNotification> findByRestaurantIdOrderByCreatedAtDesc(String restaurantId);

    long countByRestaurantIdAndReadFalse(String restaurantId);
}
