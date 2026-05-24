package com.project.orderservice.controller;

import com.project.orderservice.document.Order;
import com.project.orderservice.dto.BaseAPIResponse;
import com.project.orderservice.dto.PlaceOrderRequest;
import com.project.orderservice.dto.UpdateStatusRequest;
import com.project.orderservice.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /** POST /api/orders — Place order for one restaurant from cart */
    @PostMapping
    public ResponseEntity<BaseAPIResponse> placeOrder(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody PlaceOrderRequest req) {

        Order order = orderService.placeOrder(userId, req);
        return ResponseEntity.ok(new BaseAPIResponse("ORDER_PLACED", order, 200, null));
    }

    /** GET /api/orders — Order history for the logged-in user */
    @GetMapping
    public ResponseEntity<BaseAPIResponse> getOrders(
            @RequestHeader("X-User-Id") String userId) {

        List<Order> orders = orderService.getOrderHistory(userId);
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS", orders, 200, null));
    }

    /** GET /api/orders/{id} — Single order detail */
    @GetMapping("/{id}")
    public ResponseEntity<BaseAPIResponse> getOrder(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {

        Order order = orderService.getOrder(userId, id);
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS", order, 200, null));
    }

    /**
     * GET /api/orders/restaurant/{restaurantId}?statuses=PLACED,CONFIRMED,PREPARING,READY
     * Restaurant partner fetches their incoming/live orders.
     * When statuses param is omitted, returns all orders for that restaurant.
     */
    @GetMapping("/restaurant/{restaurantId}")
    public ResponseEntity<BaseAPIResponse> getRestaurantOrders(
            @PathVariable String restaurantId,
            @RequestParam(required = false) String statuses) {

        List<String> statusList = (statuses != null && !statuses.isBlank())
                ? Arrays.asList(statuses.split(","))
                : Collections.emptyList();

        List<Order> orders = orderService.getRestaurantOrders(restaurantId, statusList);
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS", orders, 200, null));
    }

    /**
     * GET /api/orders/restaurant/{restaurantId}/all?page=0&size=10&from=2025-05-01&to=2025-05-24
     * Paginated full order history for a restaurant — used by the All Orders tab.
     * from/to are optional ISO local dates (yyyy-MM-dd). When omitted, all orders are returned.
     */
    @GetMapping("/restaurant/{restaurantId}/all")
    public ResponseEntity<BaseAPIResponse> getAllRestaurantOrders(
            @PathVariable String restaurantId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {

        LocalDateTime fromDt = (from != null && !from.isBlank())
                ? LocalDate.parse(from).atStartOfDay() : null;
        LocalDateTime toDt   = (to   != null && !to.isBlank())
                ? LocalDate.parse(to).atTime(LocalTime.MAX) : null;

        return ResponseEntity.ok(new BaseAPIResponse(
                "SUCCESS",
                orderService.getRestaurantAllOrders(restaurantId, page, size, fromDt, toDt),
                200, null));
    }

    /**
     * PUT /api/orders/{id}/status — Restaurant partner updates order status.
     * Transitions: PLACED → CONFIRMED → PREPARING → READY → DELIVERED
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<BaseAPIResponse> updateStatus(
            @PathVariable String id,
            @Valid @RequestBody UpdateStatusRequest req) {

        Order order = orderService.updateStatus(id, req.getStatus());
        return ResponseEntity.ok(new BaseAPIResponse("STATUS_UPDATED", order, 200, null));
    }
}
