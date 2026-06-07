package com.project.api_gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class FallbackController {

    @RequestMapping("/fallback/user-service")
    public ResponseEntity<Map<String, Object>> userServiceFallback() {
        return unavailable("user-service", "Authentication and user features are temporarily unavailable.");
    }

    @RequestMapping("/fallback/food-service")
    public ResponseEntity<Map<String, Object>> foodServiceFallback() {
        return unavailable("food-service", "Restaurant and menu data is temporarily unavailable.");
    }

    @RequestMapping("/fallback/order-service")
    public ResponseEntity<Map<String, Object>> orderServiceFallback() {
        return unavailable("order-service", "Cart and order features are temporarily unavailable.");
    }

    @RequestMapping("/fallback/notification-service")
    public ResponseEntity<Map<String, Object>> notificationServiceFallback() {
        return unavailable("notification-service", "Notification features are temporarily unavailable.");
    }

    private ResponseEntity<Map<String, Object>> unavailable(String service, String message) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "status", 503,
                "error", "Service Unavailable",
                "service", service,
                "message", message
        ));
    }
}
