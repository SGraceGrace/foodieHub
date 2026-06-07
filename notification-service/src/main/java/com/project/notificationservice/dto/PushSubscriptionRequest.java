package com.project.notificationservice.dto;

import java.util.Map;

public record PushSubscriptionRequest(
        String endpoint,
        Long expirationTime,
        Map<String, String> keys
) {}
