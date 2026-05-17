package com.project.foodieHub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class ActivityLogDTO {
    private Long id;
    private String actorEmail;
    private String action;
    private String targetEntity;
    private Long targetId;
    private String details;
    private LocalDateTime createdAt;
}
