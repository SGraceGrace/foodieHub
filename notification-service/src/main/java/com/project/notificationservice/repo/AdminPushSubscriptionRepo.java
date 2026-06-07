package com.project.notificationservice.repo;

import com.project.notificationservice.entity.AdminPushSubscription;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface AdminPushSubscriptionRepo extends MongoRepository<AdminPushSubscription, String> {
    Optional<AdminPushSubscription> findByAdminEmailAndEndpoint(String adminEmail, String endpoint);
    List<AdminPushSubscription> findByAdminRoleContaining(String role);
}
