package com.project.orderservice.controller;

import com.project.orderservice.document.Order;
import com.project.orderservice.constants.CommonConstants;
import com.project.orderservice.dto.BaseAPIResponse;
import com.project.orderservice.dto.MarkRatedRequest;
import com.project.orderservice.dto.PlaceOrderRequest;
import com.project.orderservice.dto.UpdateStatusRequest;
import com.project.orderservice.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    @PreAuthorize("hasRole('END_USERS')")
    @PostMapping
    public ResponseEntity<BaseAPIResponse> placeOrder(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody PlaceOrderRequest req) {

        Order order = orderService.placeOrder(userId, req);
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.ORDER_PLACED, order, 200, null));
    }

    /** GET /api/orders — Order history for the logged-in user */
    @PreAuthorize("hasRole('END_USERS')")
    @GetMapping
    public ResponseEntity<BaseAPIResponse> getOrders(
            @RequestHeader("X-User-Id") String userId) {

        List<Order> orders = orderService.getOrderHistory(userId);
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS, orders, 200, null));
    }

    /** GET /api/orders/{id} — Single order detail */
    @PreAuthorize("hasRole('END_USERS')")
    @GetMapping("/{id}")
    public ResponseEntity<BaseAPIResponse> getOrder(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {

        Order order = orderService.getOrder(userId, id);
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS, order, 200, null));
    }

    /**
     * GET /api/orders/restaurant/{restaurantId}?statuses=PLACED,CONFIRMED,PREPARING,READY
     * Restaurant partner fetches their incoming/live orders.
     * When statuses param is omitted, returns all orders for that restaurant.
     */
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    @GetMapping("/restaurant/{restaurantId}")
    public ResponseEntity<BaseAPIResponse> getRestaurantOrders(
            @PathVariable String restaurantId,
            @RequestParam(required = false) String statuses) {

        List<String> statusList = (statuses != null && !statuses.isBlank())
                ? Arrays.asList(statuses.split(","))
                : Collections.emptyList();

        List<Order> orders = orderService.getRestaurantOrders(restaurantId, statusList);
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS, orders, 200, null));
    }

    /**
     * GET /api/orders/restaurant/{restaurantId}/all?page=0&size=10&from=2025-05-01&to=2025-05-24
     * Paginated full order history for a restaurant — used by the All Orders tab.
     * from/to are optional ISO local dates (yyyy-MM-dd). When omitted, all orders are returned.
     */
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
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
                CommonConstants.SUCCESS,
                orderService.getRestaurantAllOrders(restaurantId, page, size, fromDt, toDt),
                200, null));
    }

    /**
     * PUT /api/orders/{id}/status — Restaurant partner updates order status.
     * Transitions: PLACED → CONFIRMED → PREPARING → READY → DELIVERED
     */
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    @PutMapping("/{id}/status")
    public ResponseEntity<BaseAPIResponse> updateStatus(
            @PathVariable String id,
            @Valid @RequestBody UpdateStatusRequest req) {

        Order order = orderService.updateStatus(id, req.getStatus());
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.STATUS_UPDATED, order, 200, null));
    }

    /**
     * GET /api/orders/restaurant/{restaurantId}/stats
     * Overview stats for the partner workspace: today's orders/revenue, pending, total.
     */
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    @GetMapping("/restaurant/{restaurantId}/stats")
    public ResponseEntity<BaseAPIResponse> getRestaurantStats(
            @PathVariable String restaurantId) {
        return ResponseEntity.ok(new BaseAPIResponse(
                CommonConstants.SUCCESS, orderService.getRestaurantStats(restaurantId), 200, null));
    }

    /**
     * GET /api/orders/available — All unassigned active orders visible to drivers.
     * Returns orders where driverEmail IS NULL and status IN (PLACED, CONFIRMED, PREPARING, READY).
     */
    @PreAuthorize("hasRole('DRIVER')")
    @GetMapping("/available")
    public ResponseEntity<BaseAPIResponse> getAvailableOrders() {
        return ResponseEntity.ok(
                new BaseAPIResponse(CommonConstants.SUCCESS, orderService.getAvailableOrders(), 200, null));
    }

    /**
     * GET /api/orders/driver/active — The driver's own current in-progress delivery.
     * Returns the order they accepted but haven't delivered yet, or null if none.
     * Used to restore active delivery state after a page refresh.
     */
    @PreAuthorize("hasRole('DRIVER')")
    @GetMapping("/driver/active")
    public ResponseEntity<BaseAPIResponse> getDriverActiveOrder(
            @RequestHeader("X-User-Id") String driverEmail) {
        Order order = orderService.getDriverActiveOrder(driverEmail);
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS, order, 200, null));
    }

    /**
     * GET /api/orders/driver/earnings
     * Earnings summary for the logged-in driver: today, this week, all-time, weekly breakdown.
     * All monetary values represent 15% commission on totalAmount of DELIVERED orders.
     */
    @PreAuthorize("hasRole('DRIVER')")
    @GetMapping("/driver/earnings")
    public ResponseEntity<BaseAPIResponse> getDriverEarnings(
            @RequestHeader("X-User-Id") String driverEmail) {
        return ResponseEntity.ok(new BaseAPIResponse(
                CommonConstants.SUCCESS,
                orderService.getDriverEarnings(driverEmail),
                200, null));
    }

    /**
     * GET /api/orders/driver/history?page=0&size=10
     * Paginated delivery history for the logged-in driver.
     * Returns all DELIVERED and CANCELLED orders where driverEmail matches.
     */
    @PreAuthorize("hasRole('DRIVER')")
    @GetMapping("/driver/history")
    public ResponseEntity<BaseAPIResponse> getDriverHistory(
            @RequestHeader("X-User-Id") String driverEmail,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse(
                CommonConstants.SUCCESS,
                orderService.getDriverHistory(driverEmail, page, size),
                200, null));
    }

    /**
     * PATCH /api/orders/{id}/accept — Driver claims an order.
     * Stores the driver's email on the order. Returns 409 if already taken.
     * No request body needed — driver identity comes from the X-User-Id header.
     */
    @PreAuthorize("hasRole('DRIVER')")
    @PatchMapping("/{id}/accept")
    public ResponseEntity<BaseAPIResponse> acceptOrder(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String driverEmail) {
        Order order = orderService.acceptOrder(id, driverEmail);
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.ORDER_ACCEPTED, order, 200, null));
    }

    /**
     * PATCH /api/orders/{id}/rated — Customer marks an order as rated.
     * Called immediately after successfully submitting a star rating to food-service.
     * Sets rated=true so the UI hides the rating button and prevents duplicates.
     * Accepts an optional body: { "driverRating": 1-5 } — stored for analytics; null is fine.
     */
    @PreAuthorize("hasRole('END_USERS')")
    @PatchMapping("/{id}/rated")
    public ResponseEntity<BaseAPIResponse> markRated(
            @PathVariable String id,
            @RequestBody(required = false) MarkRatedRequest req) {
        Integer driverRating = (req != null) ? req.getDriverRating() : null;
        Order order = orderService.markRated(id, driverRating);
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS, order, 200, null));
    }

    /**
     * PATCH /api/orders/{id}/driver-status — Driver updates order status.
     * Allowed transitions driven by the driver: READY → OUT_FOR_DELIVERY → DELIVERED.
     * Publishes the same OrderStatusUpdatedEvent so the customer is notified via SSE + Web Push.
     */
    /** GET /api/orders/admin/all — Paginated all orders for admin panel */
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @GetMapping("/admin/all")
    public ResponseEntity<BaseAPIResponse> getAdminOrders(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false)    String status) {
        return ResponseEntity.ok(new BaseAPIResponse(
                CommonConstants.SUCCESS,
                orderService.getAdminOrders(page, size, status),
                200, null));
    }

    /** GET /api/orders/admin/stats — Platform-wide order stats for admin dashboard */
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @GetMapping("/admin/stats")
    public ResponseEntity<BaseAPIResponse> getAdminStats() {
        return ResponseEntity.ok(new BaseAPIResponse(
                CommonConstants.SUCCESS,
                orderService.getAdminStats(),
                200, null));
    }

    @PreAuthorize("hasRole('DRIVER')")
    @PatchMapping("/{id}/driver-status")
    public ResponseEntity<BaseAPIResponse> driverUpdateStatus(
            @PathVariable String id,
            @Valid @RequestBody UpdateStatusRequest req) {
        Order order = orderService.updateStatus(id, req.getStatus());
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.STATUS_UPDATED, order, 200, null));
    }
}
