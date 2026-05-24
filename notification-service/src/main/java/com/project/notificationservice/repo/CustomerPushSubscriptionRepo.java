package com.project.notificationservice.repo;

import com.project.notificationservice.entity.CustomerPushSubscription;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerPushSubscriptionRepo extends MongoRepository<CustomerPushSubscription, String> {
    Optional<CustomerPushSubscription> findByUserIdAndEndpoint(String userId, String endpoint);
    List<CustomerPushSubscription> findByUserId(String userId);
}
