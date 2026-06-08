package com.project.foodieHub.service;

import com.project.foodieHub.dto.ActivityLogDTO;

import java.util.List;

public interface ActivityLogService {
    void log(String action, String targetEntity, Long targetId, String details);
    List<ActivityLogDTO> getLogs();
}
