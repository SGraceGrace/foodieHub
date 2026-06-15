package com.project.notificationservice.controller;

import com.project.notificationservice.constants.CommonConstants;
import com.project.notificationservice.dto.BaseAPIResponse;
import com.project.notificationservice.dto.PushSubscriptionRequest;
import com.project.notificationservice.service.AdminNotificationService;
import com.project.notificationservice.service.SseEmitterService;
import com.project.notificationservice.service.WebPushService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
@RestController
@RequiredArgsConstructor
public class AdminNotificationController {

    private final AdminNotificationService notificationService;
    private final SseEmitterService sseEmitterService;
    private final WebPushService webPushService;

    @GetMapping(value = "/api/v1/admin/notifications/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @RequestHeader("X-User-Id") String adminEmail,
            @RequestHeader("X-User-Role") String adminRole) {
        return sseEmitterService.subscribe(adminEmail, adminRole);
    }

    @GetMapping("/api/v1/admin/notifications")
    public ResponseEntity<BaseAPIResponse> getNotifications(
            @RequestHeader("X-User-Id") String adminEmail,
            @RequestHeader("X-User-Role") String adminRole) {
        return ResponseEntity.ok(new BaseAPIResponse(
                CommonConstants.SUCCESS,
                notificationService.getNotifications(adminEmail, adminRole),
                HttpStatus.OK.value(), null));
    }

    @DeleteMapping("/api/v1/admin/notifications/{id}")
    public ResponseEntity<BaseAPIResponse> dismiss(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String adminEmail) {
        notificationService.dismiss(id, adminEmail);
        return ResponseEntity.ok(new BaseAPIResponse(
                CommonConstants.NOTIFICATION_DISMISSED, null, HttpStatus.OK.value(), null));
    }

    @DeleteMapping("/api/v1/admin/notifications")
    public ResponseEntity<BaseAPIResponse> clearAll(
            @RequestHeader("X-User-Id") String adminEmail,
            @RequestHeader("X-User-Role") String adminRole) {
        notificationService.clearAll(adminEmail, adminRole);
        return ResponseEntity.ok(new BaseAPIResponse(
                "All notifications cleared", null, HttpStatus.OK.value(), null));
    }

    @PostMapping("/api/v1/admin/push-subscription")
    public ResponseEntity<BaseAPIResponse> savePushSubscription(
            @RequestHeader("X-User-Id") String adminEmail,
            @RequestHeader("X-User-Role") String adminRole,
            @RequestBody PushSubscriptionRequest request) {
        webPushService.saveSubscription(adminEmail, adminRole, request);
        return ResponseEntity.ok(new BaseAPIResponse(
                "Push subscription saved", null, HttpStatus.OK.value(), null));
    }
}
