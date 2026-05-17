package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.ActivityLogDTO;
import com.project.foodieHub.entity.ActivityLog;
import com.project.foodieHub.entity.User;
import com.project.foodieHub.repo.ActivityLogRepo;
import com.project.foodieHub.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityLogServiceImpl implements ActivityLogService {

    private final ActivityLogRepo activityLogRepo;

    @Override
    public void log(String action, String targetEntity, Long targetId, String details) {
        ActivityLog entry = new ActivityLog();
        entry.setActorEmail(resolveActorEmail());
        entry.setAction(action);
        entry.setTargetEntity(targetEntity);
        entry.setTargetId(targetId);
        entry.setDetails(details);
        activityLogRepo.save(entry);
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
