package com.project.notificationservice.controller;

import com.project.notificationservice.constants.CommonConstants;
import com.project.notificationservice.dto.BaseAPIResponse;
import com.project.notificationservice.entity.RestaurantNotification;
import com.project.notificationservice.repo.RestaurantNotificationRepo;
import com.project.notificationservice.service.SseEmitterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/v1/restaurant/notifications")
@RequiredArgsConstructor
public class RestaurantNotificationController {

    private final SseEmitterService sseEmitterService;
    private final RestaurantNotificationRepo restaurantNotificationRepo;

    /**
     * SSE stream — partner workspace subscribes here when it opens.
     * GET /api/v1/restaurant/notifications/stream/{restaurantId}
     */
    @GetMapping(value = "/stream/{restaurantId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable String restaurantId) {
        return sseEmitterService.subscribeRestaurant(restaurantId);
    }

    /**
     * List recent notifications for a restaurant (most recent first).
     * GET /api/v1/restaurant/notifications/{restaurantId}
     */
    @GetMapping("/{restaurantId}")
    public ResponseEntity<BaseAPIResponse> getNotifications(@PathVariable String restaurantId) {
        List<RestaurantNotification> list =
                restaurantNotificationRepo.findByRestaurantIdOrderByCreatedAtDesc(restaurantId);
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS, list, HttpStatus.OK.value(), null));
    }

    /**
     * Mark a single notification as read.
     * PUT /api/v1/restaurant/notifications/{id}/read
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<BaseAPIResponse> markRead(@PathVariable String id) {
        restaurantNotificationRepo.findById(id).ifPresent(n -> {
            n.setRead(true);
            restaurantNotificationRepo.save(n);
        });
        return ResponseEntity.ok(new BaseAPIResponse("OK", null, HttpStatus.OK.value(), null));
    }

    /**
     * Mark ALL unread notifications for a restaurant as read.
     * PUT /api/v1/restaurant/notifications/{restaurantId}/read-all
     */
    @PutMapping("/{restaurantId}/read-all")
    public ResponseEntity<BaseAPIResponse> markAllRead(@PathVariable String restaurantId) {
        List<RestaurantNotification> unread =
                restaurantNotificationRepo.findByRestaurantIdOrderByCreatedAtDesc(restaurantId);
        unread.forEach(n -> n.setRead(true));
        restaurantNotificationRepo.saveAll(unread);
        return ResponseEntity.ok(new BaseAPIResponse("OK", null, HttpStatus.OK.value(), null));
    }

    /**
     * Hard-delete all notifications for a restaurant.
     * DELETE /api/v1/restaurant/notifications/{restaurantId}
     * Called by the "Clear all" button — notifications are transient alerts;
     * order data lives in the orders collection.
     */
    @DeleteMapping("/{restaurantId}")
    public ResponseEntity<BaseAPIResponse> clearAll(@PathVariable String restaurantId) {
        restaurantNotificationRepo.deleteByRestaurantId(restaurantId);
        return ResponseEntity.ok(new BaseAPIResponse("OK", null, HttpStatus.OK.value(), null));
    }
}
