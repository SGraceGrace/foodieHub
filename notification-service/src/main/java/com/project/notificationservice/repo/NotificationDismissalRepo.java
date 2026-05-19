package com.project.notificationservice.repo;

import com.project.notificationservice.entity.NotificationDismissal;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Repository
public interface NotificationDismissalRepo extends MongoRepository<NotificationDismissal, String> {

    List<NotificationDismissal> findByAdminEmail(String adminEmail);

    boolean existsByAdminEmailAndNotificationId(String adminEmail, String notificationId);

    default Set<String> findDismissedIds(String adminEmail) {
        return findByAdminEmail(adminEmail).stream()
                .map(NotificationDismissal::getNotificationId)
                .collect(Collectors.toSet());
    }
}
