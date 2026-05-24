package com.project.notificationservice.repo;

import com.project.notificationservice.entity.DriverPushSubscription;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface DriverPushSubscriptionRepo extends MongoRepository<DriverPushSubscription, String> {

    Optional<DriverPushSubscription> findByDriverEmailAndEndpoint(String driverEmail, String endpoint);

    List<DriverPushSubscription> findByDriverEmail(String driverEmail);
}
