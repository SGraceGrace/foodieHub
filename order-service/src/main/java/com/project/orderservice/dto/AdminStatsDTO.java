package com.project.orderservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AdminStatsDTO {
    private long totalOrdersToday;
    private double totalRevenueToday;
    private long totalOrders;
    private double totalRevenue;
}
