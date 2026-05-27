package com.project.orderservice.dto;

/**
 * Overview stats returned by GET /api/orders/restaurant/{id}/stats
 * Displayed on the restaurant partner workspace Overview tab.
 */
public record RestaurantStatsDTO(
        long   todayOrders,     // orders placed today (IST)
        double todayRevenue,    // sum of restaurantEarnings for today's orders
        long   pendingOrders,   // PLACED + CONFIRMED — needs action
        long   totalOrders,     // all-time order count
        double totalRevenue     // all-time sum of restaurantEarnings (subtotal fallback for legacy orders)
) {}
