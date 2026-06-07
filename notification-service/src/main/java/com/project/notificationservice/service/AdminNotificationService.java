package com.project.notificationservice.service;

import com.project.notificationservice.dto.NotificationDTO;

import java.util.List;

public interface AdminNotificationService {
    List<NotificationDTO> getNotifications(String adminEmail, String adminRole);
    void dismiss(String id, String adminEmail);
    void clearAll(String adminEmail, String adminRole);
}
