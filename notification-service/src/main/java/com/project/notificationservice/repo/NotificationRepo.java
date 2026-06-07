package com.project.notificationservice.repo;

import com.project.notificationservice.entity.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepo extends MongoRepository<Notification, String> {

    // ADMIN: only ALL_ADMINS notifications
    List<Notification> findByVisibleToOrderByCreatedAtDesc(String visibleTo);

    // SUPER_ADMIN: all notifications
    List<Notification> findAllByOrderByCreatedAtDesc();
}
