package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.ActivityLogDTO;
import com.project.foodieHub.entity.ActivityLog;
import com.project.foodieHub.entity.User;
import com.project.foodieHub.messaging.ActivityLoggedEvent;
import com.project.foodieHub.messaging.RabbitMQConfig;
import com.project.foodieHub.repo.ActivityLogRepo;
import com.project.foodieHub.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ActivityLogServiceImpl implements ActivityLogService {

    private final ActivityLogRepo activityLogRepo;
    private final RabbitTemplate rabbitTemplate;

    private static final Map<String, String> ACTION_LABELS = Map.of(
        "APPROVE_OWNER",  "approved restaurant owner",
        "REJECT_OWNER",   "rejected restaurant owner",
        "SUSPEND_USER",   "suspended user",
        "UNSUSPEND_USER", "unsuspended user",
        "CREATE_ADMIN",   "created admin user",
        "APPROVE_DRIVER", "approved driver",
        "REJECT_DRIVER",  "rejected driver"
    );

    @Override
    public void log(String action, String targetEntity, Long targetId, String details) {
        ActivityLog entry = new ActivityLog();
        entry.setActorEmail(resolveActorEmail());
        entry.setAction(action);
        entry.setTargetEntity(targetEntity);
        entry.setTargetId(targetId);
        entry.setDetails(details);
        ActivityLog saved = activityLogRepo.save(entry);

        String message = ACTION_LABELS.getOrDefault(action, action.toLowerCase().replace('_', ' '))
                + " on " + targetEntity + " #" + targetId
                + (details != null ? " (" + details + ")" : "");

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.ACTIVITY_RKEY,
                new ActivityLoggedEvent(saved.getId(), saved.getActorEmail(), message, saved.getCreatedAt())
        );
    }

    @Override
    public List<ActivityLogDTO> getLogs() {
        return activityLogRepo.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(l -> new ActivityLogDTO(
                        l.getId(), l.getActorEmail(), l.getAction(),
                        l.getTargetEntity(), l.getTargetId(), l.getDetails(), l.getCreatedAt()))
                .toList();
    }

    private String resolveActorEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) {
            return user.getEmail();
        }
        return "SYSTEM";
    }

}
