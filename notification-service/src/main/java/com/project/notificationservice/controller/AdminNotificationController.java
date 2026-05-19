package com.project.notificationservice.controller;

import com.project.notificationservice.dto.BaseAPIResponse;
import com.project.notificationservice.service.AdminNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class AdminNotificationController {

    private final AdminNotificationService notificationService;

    @GetMapping("/api/v1/admin/notifications")
    public ResponseEntity<BaseAPIResponse> getNotifications(
            @RequestHeader("X-User-Id") String adminEmail,
            @RequestHeader("X-User-Role") String adminRole) {
        return ResponseEntity.ok(new BaseAPIResponse(
                "SUCCESS",
                notificationService.getNotifications(adminEmail, adminRole),
                HttpStatus.OK.value(), null));
    }

    @DeleteMapping("/api/v1/admin/notifications/{id}")
    public ResponseEntity<BaseAPIResponse> dismiss(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String adminEmail) {
        notificationService.dismiss(id, adminEmail);
        return ResponseEntity.ok(new BaseAPIResponse(
                "Notification dismissed", null, HttpStatus.OK.value(), null));
    }

    @DeleteMapping("/api/v1/admin/notifications")
    public ResponseEntity<BaseAPIResponse> clearAll(
            @RequestHeader("X-User-Id") String adminEmail,
            @RequestHeader("X-User-Role") String adminRole) {
        notificationService.clearAll(adminEmail, adminRole);
        return ResponseEntity.ok(new BaseAPIResponse(
                "All notifications cleared", null, HttpStatus.OK.value(), null));
    }
}
