package com.project.foodieHub.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "activity_log")
@Data
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_email")
    private String actorEmail;

    @Column(name = "action", nullable = false)
    private String action;

    @Column(name = "target_entity")
    private String targetEntity;

    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "details")
    private String details;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
