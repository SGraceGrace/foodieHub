package com.project.notificationservice.controller;

import com.project.notificationservice.constants.CommonConstants;
import com.project.notificationservice.dto.BaseAPIResponse;
import com.project.notificationservice.dto.CustomerOrderUpdateDTO;
import com.project.notificationservice.dto.PushSubscriptionRequest;
import com.project.notificationservice.entity.CustomerNotification;
import com.project.notificationservice.repo.CustomerNotificationRepo;
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
 * Customer notification endpoints — mirrors the admin and restaurant patterns:
 *
 *  GET    /api/v1/customer/notifications/stream   SSE stream (real-time)
 *  GET    /api/v1/customer/notifications           Fetch stored history (on page load)
 *  PUT    /api/v1/customer/notifications/read-all  Mark all as read (when bell opens)
 *  DELETE /api/v1/customer/notifications           Clear all
 *  POST   /api/v1/customer/push-subscription       Save Web Push subscription
 */
@RestController
@RequestMapping("/api/v1/customer")
@RequiredArgsConstructor
public class CustomerNotificationController {

    private final SseEmitterService       sseEmitterService;
    private final WebPushService          webPushService;
    private final CustomerNotificationRepo customerNotificationRepo;

    // ── SSE stream ────────────────────────────────────────────────────

    @GetMapping(value = "/notifications/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestHeader("X-User-Id") String userId) {
        return sseEmitterService.subscribeCustomer(userId);
    }

    // ── History — loaded once on page init ────────────────────────────

    @GetMapping("/notifications")
    public ResponseEntity<BaseAPIResponse> getNotifications(
            @RequestHeader("X-User-Id") String userId) {
        List<CustomerNotification> stored =
                customerNotificationRepo.findByUserIdOrderByCreatedAtDesc(
                        userId, PageRequest.of(0, 20));

        List<CustomerOrderUpdateDTO> dtos = stored.stream()
                .map(n -> new CustomerOrderUpdateDTO(
                        n.getId(),
                        n.getOrderId(),
                        n.getRestaurantName(),
                        n.getNewStatus(),
                        n.getMessage(),
                        n.getCreatedAt(),
                        n.isRead()))
                .toList();

        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS, dtos, HttpStatus.OK.value(), null));
    }

    // ── Mark all read — called when the bell panel opens ─────────────

    @PutMapping("/notifications/read-all")
    public ResponseEntity<BaseAPIResponse> markAllRead(
            @RequestHeader("X-User-Id") String userId) {
        List<CustomerNotification> list = customerNotificationRepo.findByUserId(userId);
        list.forEach(n -> n.setRead(true));
        customerNotificationRepo.saveAll(list);
        return ResponseEntity.ok(new BaseAPIResponse("OK", null, HttpStatus.OK.value(), null));
    }

    // ── Clear all — called by "Clear all" button ──────────────────────

    @DeleteMapping("/notifications")
    public ResponseEntity<BaseAPIResponse> clearAll(
            @RequestHeader("X-User-Id") String userId) {
        customerNotificationRepo.deleteByUserId(userId);
        return ResponseEntity.ok(new BaseAPIResponse("OK", null, HttpStatus.OK.value(), null));
    }

    // ── Web Push subscription ─────────────────────────────────────────

    @PostMapping("/push-subscription")
    public ResponseEntity<BaseAPIResponse> savePushSubscription(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody PushSubscriptionRequest request) {
        webPushService.saveCustomerSubscription(userId, request);
        return ResponseEntity.ok(new BaseAPIResponse(
                "Push subscription saved", null, HttpStatus.OK.value(), null));
    }
}
