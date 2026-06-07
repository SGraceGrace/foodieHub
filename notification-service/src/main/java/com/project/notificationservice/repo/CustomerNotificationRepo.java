package com.project.notificationservice.repo;

import com.project.notificationservice.entity.CustomerNotification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CustomerNotificationRepo extends MongoRepository<CustomerNotification, String> {

    /** Fetch up to N most-recent notifications for a customer (bell panel). */
    List<CustomerNotification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    /** Fetch all notifications for a customer (used for mark-read / delete). */
    List<CustomerNotification> findByUserId(String userId);

    /** Delete all notifications for a customer (used by "Clear all"). */
    void deleteByUserId(String userId);
}
