package com.project.notificationservice.controller;

import com.project.notificationservice.dto.BaseAPIResponse;
import com.project.notificationservice.dto.PushSubscriptionRequest;
import com.project.notificationservice.service.SseEmitterService;
import com.project.notificationservice.service.WebPushService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Customer notification endpoints:
 *
 *  GET  /api/v1/customer/notifications/stream
 *       SSE stream — Angular subscribes here for live order-status updates
 *       (used to patch the order tracker while the page is open)
 *
 *  POST /api/v1/customer/push-subscription
 *       Saves the browser's Web Push subscription so the backend can send
 *       VAPID push messages even when the tab is closed
 */
@RestController
@RequestMapping("/api/v1/customer")
@RequiredArgsConstructor
public class CustomerNotificationController {

    private final SseEmitterService sseEmitterService;
    private final WebPushService    webPushService;

    @GetMapping(value = "/notifications/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestHeader("X-User-Id") String userId) {
        return sseEmitterService.subscribeCustomer(userId);
    }

    @PostMapping("/push-subscription")
    public ResponseEntity<BaseAPIResponse> savePushSubscription(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody PushSubscriptionRequest request) {
        webPushService.saveCustomerSubscription(userId, request);
        return ResponseEntity.ok(new BaseAPIResponse(
                "Push subscription saved", null, HttpStatus.OK.value(), null));
    }
}
