package com.project.notificationservice.repo;

import com.project.notificationservice.entity.DriverNotification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DriverNotificationRepo extends MongoRepository<DriverNotification, String> {

    /** Fetch up to N most recent notifications for a driver. */
    List<DriverNotification> findByDriverEmailOrderByCreatedAtDesc(String driverEmail, Pageable pageable);

    /** Fetch all notifications for a driver (used for mark-read / delete). */
    List<DriverNotification> findByDriverEmail(String driverEmail);

    /** Delete all notifications for a driver (hard-delete, same as customer/restaurant). */
    void deleteByDriverEmail(String driverEmail);
}
