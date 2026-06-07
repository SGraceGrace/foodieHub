package com.project.notificationservice.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "customer_push_subscriptions")
public class CustomerPushSubscription {
    @Id
    private String id;
    private String userId;      // customer's email / X-User-Id from JWT
    private String endpoint;
    private String p256dh;
    private String auth;
    private Instant createdAt;
}
