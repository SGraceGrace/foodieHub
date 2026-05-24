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

    /** Update order status (called by restaurant partner). */
    Order updateStatus(String orderId, String newStatus);
}
