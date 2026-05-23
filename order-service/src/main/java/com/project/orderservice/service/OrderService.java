package com.project.orderservice.service;

import com.project.orderservice.document.Order;
import com.project.orderservice.dto.PlaceOrderRequest;

import java.util.List;

public interface OrderService {

    /** Create an order from the cart, clear the restaurant bucket, publish RabbitMQ event. */
    Order placeOrder(String userId, PlaceOrderRequest req);

    List<Order> getOrderHistory(String userId);

    Order getOrder(String userId, String orderId);

    /** Live orders for a restaurant — filtered by active statuses when statuses list is provided. */
    List<Order> getRestaurantOrders(String restaurantId, List<String> statuses);

    /** Update order status (called by restaurant partner). */
    Order updateStatus(String orderId, String newStatus);
}
