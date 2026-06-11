package com.project.orderservice.service;

import com.project.orderservice.document.Order;
import com.project.orderservice.dto.PaginatedResponse;
import com.project.orderservice.dto.PlaceOrderRequest;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderService {

    /** Create an order from the cart, clear the restaurant bucket, publish RabbitMQ event. */
    Order placeOrder(String userId, PlaceOrderRequest req);

    List<Order> getOrderHistory(String userId);

    Order getOrder(String userId, String orderId);

    /** Live orders for a restaurant — filtered by active statuses when provided. */
    List<Order> getRestaurantOrders(String restaurantId, List<String> statuses);

    /**
     * All orders for a restaurant — paginated, for the All Orders history tab.
     * Pass null for from/to to fetch all time.
     */
    PaginatedResponse<Order> getRestaurantAllOrders(
            String restaurantId, int page, int size, LocalDateTime from, LocalDateTime to);

    /** Update order status (called by restaurant partner or driver). */
    Order updateStatus(String orderId, String newStatus);

    /**
     * Driver claims an order — stores driverEmail on the order document.
     * Throws 409 CONFLICT if another driver has already accepted it.
     */
    Order acceptOrder(String orderId, String driverEmail);

    /**
     * Returns all unassigned active orders visible to drivers.
     * Unassigned = driverEmail is null. Active = PLACED, CONFIRMED, PREPARING, READY.
     */
    List<Order> getAvailableOrders();

    /**
     * Returns the driver's current active order (the one they accepted but haven't delivered yet).
     * Returns null if the driver has no active delivery right now.
     */
    Order getDriverActiveOrder(String driverEmail);

    /**
     * Mark order as rated — prevents the customer from rating twice.
     * @param driverRating optional 1-5 driver rating; null if skipped or no driver was assigned.
     */
    Order markRated(String orderId, Integer driverRating);

    /**
     * Driver's completed / cancelled delivery history — paginated.
     * Returns DELIVERED + CANCELLED orders where the driver is the one who handled them.
     */
    PaginatedResponse<Order> getDriverHistory(String driverEmail, int page, int size);

    /**
     * Driver earnings summary — today, this week, all-time, and per-day weekly breakdown.
     * Earnings = 15% of totalAmount for each DELIVERED order.
     */
    com.project.orderservice.dto.DriverEarningsDTO getDriverEarnings(String driverEmail);

    /** Overview stats for the restaurant partner workspace. */
    com.project.orderservice.dto.RestaurantStatsDTO getRestaurantStats(String restaurantId);

    /** Paginated all orders for admin — optionally filtered by status. */
    PaginatedResponse<Order> getAdminOrders(int page, int size, String status);

    /** Platform-wide stats for the admin dashboard. */
    com.project.orderservice.dto.AdminStatsDTO getAdminStats();
}
