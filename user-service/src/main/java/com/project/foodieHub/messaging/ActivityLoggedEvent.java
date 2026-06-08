package com.project.foodieHub.messaging;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ActivityLoggedEvent {
    private Long sourceId;
    private String actorEmail;
    private String message;
    private LocalDateTime timestamp;
}
