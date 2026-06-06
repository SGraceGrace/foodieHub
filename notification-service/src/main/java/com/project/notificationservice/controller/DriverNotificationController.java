package com.project.notificationservice.controller;

import com.project.notificationservice.constants.CommonConstants;
import com.project.notificationservice.dto.BaseAPIResponse;
import com.project.notificationservice.dto.DriverOrderNotificationDTO;
import com.project.notificationservice.dto.PushSubscriptionRequest;
import com.project.notificationservice.entity.DriverNotification;
import com.project.notificationservice.repo.DriverNotificationRepo;
import com.project.notificationservice.service.SseEmitterService;
import com.project.notificationservice.service.WebPushService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

/**
 * Driver notification endpoints — mirrors the customer notification pattern.
 *
 *  GET    /api/v1/driver/notifications/stream   SSE stream (real-time)
 *  GET    /api/v1/driver/notifications           Fetch stored history (on page load)
 *  PUT    /api/v1/driver/notifications/read-all  Mark all as read
 *  DELETE /api/v1/driver/notifications           Clear all (hard-delete, same as customer/restaurant)
 *  POST   /api/v1/driver/push-subscription       Save Web Push subscription
 */
@RestController
@RequestMapping("/api/v1/driver")
@RequiredArgsConstructor
public class DriverNotificationController {

    private final SseEmitterService     sseEmitterService;
    private final WebPushService        webPushService;
    private final DriverNotificationRepo driverNotificationRepo;

    // ── SSE stream ────────────────────────────────────────────────────

    @GetMapping(value = "/notifications/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestHeader("X-User-Id") String driverEmail) {
        return sseEmitterService.subscribeDriver(driverEmail);
    }

    // ── History — loaded once on page init ────────────────────────────

    @GetMapping("/notifications")
    public ResponseEntity<BaseAPIResponse> getNotifications(
            @RequestHeader("X-User-Id") String driverEmail) {
        List<DriverNotification> stored =
                driverNotificationRepo.findByDriverEmailOrderByCreatedAtDesc(
                        driverEmail, PageRequest.of(0, 20));

        List<DriverOrderNotificationDTO> dtos = stored.stream()
                .map(n -> new DriverOrderNotificationDTO(
                        n.getId(),
                        n.getOrderId(),
                        n.getRestaurantName(),
                        n.getDeliveryAddress(),
                        n.getItemCount(),
                        n.getEarnAmount(),
                        n.getItemNames(),
                        n.isRead(),
                        n.getCreatedAt()))
                .toList();

        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS, dtos, HttpStatus.OK.value(), null));
    }

    // ── Mark all read ──────────────────────────────────────────────────

    @PutMapping("/notifications/read-all")
    public ResponseEntity<BaseAPIResponse> markAllRead(
            @RequestHeader("X-User-Id") String driverEmail) {
        List<DriverNotification> list = driverNotificationRepo.findByDriverEmail(driverEmail);
        list.forEach(n -> n.setRead(true));
        driverNotificationRepo.saveAll(list);
        return ResponseEntity.ok(new BaseAPIResponse("OK", null, HttpStatus.OK.value(), null));
    }

    // ── Clear all (hard-delete) ───────────────────────────────────────

    @DeleteMapping("/notifications")
    public ResponseEntity<BaseAPIResponse> clearAll(
            @RequestHeader("X-User-Id") String driverEmail) {
        driverNotificationRepo.deleteByDriverEmail(driverEmail);
        return ResponseEntity.ok(new BaseAPIResponse("OK", null, HttpStatus.OK.value(), null));
    }

    // ── Web Push subscription ─────────────────────────────────────────

    @PostMapping("/push-subscription")
    public ResponseEntity<BaseAPIResponse> savePushSubscription(
            @RequestHeader("X-User-Id") String driverEmail,
            @RequestBody PushSubscriptionRequest request) {
        webPushService.saveDriverSubscription(driverEmail, request);
        return ResponseEntity.ok(new BaseAPIResponse(
                "Push subscription saved", null, HttpStatus.OK.value(), null));
    }
}
