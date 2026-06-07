package com.project.notificationservice.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "driver_push_subscriptions")
public class DriverPushSubscription {

    @Id
    private String id;

    /** Driver's email / X-User-Id from JWT. */
    private String driverEmail;

    private String endpoint;
    private String p256dh;
    private String auth;
    private Instant createdAt;
}
