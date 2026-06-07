package com.project.notificationservice.service.impl;

import com.project.notificationservice.dto.NotificationDTO;
import com.project.notificationservice.entity.Notification;
import com.project.notificationservice.entity.NotificationDismissal;
import com.project.notificationservice.repo.NotificationDismissalRepo;
import com.project.notificationservice.repo.NotificationRepo;
import com.project.notificationservice.service.AdminNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminNotificationServiceImpl implements AdminNotificationService {

    private final NotificationRepo notificationRepo;
    private final NotificationDismissalRepo dismissalRepo;

    @Override
    public List<NotificationDTO> getNotifications(String adminEmail, String adminRole) {
        boolean isSuperAdmin = adminRole.contains("SUPER_ADMIN");
        Set<String> dismissedIds = dismissalRepo.findDismissedIds(adminEmail);

        List<Notification> all = isSuperAdmin
                ? notificationRepo.findAllByOrderByCreatedAtDesc()
                : notificationRepo.findByVisibleToOrderByCreatedAtDesc("ALL_ADMINS");

        return all.stream()
                .filter(n -> !dismissedIds.contains(n.getId()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public void dismiss(String id, String adminEmail) {
        if (!dismissalRepo.existsByAdminEmailAndNotificationId(adminEmail, id)) {
            NotificationDismissal d = new NotificationDismissal();
            d.setAdminEmail(adminEmail);
            d.setNotificationId(id);
            dismissalRepo.save(d);
        }
    }

    @Override
    public void clearAll(String adminEmail, String adminRole) {
        List<NotificationDTO> visible = getNotifications(adminEmail, adminRole);
        List<NotificationDismissal> toSave = new ArrayList<>();
        for (NotificationDTO n : visible) {
            if (!dismissalRepo.existsByAdminEmailAndNotificationId(adminEmail, n.getId())) {
                NotificationDismissal d = new NotificationDismissal();
                d.setAdminEmail(adminEmail);
                d.setNotificationId(n.getId());
                toSave.add(d);
            }
        }
        dismissalRepo.saveAll(toSave);
    }

    private NotificationDTO toDTO(Notification n) {
        return new NotificationDTO(n.getId(), n.getType(), n.getMessage(), n.getActorEmail(), n.getCreatedAt());
    }
}
