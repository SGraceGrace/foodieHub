package com.project.orderservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Earnings summary returned by GET /api/orders/driver/earnings
 * All monetary values are in INR (Rupees).
 * Driver earnings = 15% of the order's totalAmount per delivered order.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class DriverEarningsDTO {

    // ── Summary cards ─────────────────────────────────────────────────
    private double todayAmount;
    private int    todayDeliveries;

    private double weekAmount;
    private int    weekDeliveries;

    private double allTimeAmount;
    private int    allTimeDeliveries;

    // ── Average per delivery (all time) ───────────────────────────────
    private double avgEarningPerDelivery;

    // ── Current week daily breakdown (always 7 entries: Mon → Sun) ───
    private List<DayEarning> weeklyBreakdown;

    // ── Performance stats ─────────────────────────────────────────────
    private int    cancelledDeliveries;  // CANCELLED orders where driver was assigned
    private double completionRate;       // allTimeDeliveries / (all + cancelled) × 100
    private double avgRating;            // avg of driverRating across rated DELIVERED orders
    private int    ratingCount;          // number of deliveries that have been rated

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DayEarning {
        private String  dayLabel;    // "Mon", "Tue", "Wed", …
        private String  dateLabel;   // "26 May"
        private double  amount;
        private int     deliveries;
        private boolean isToday;
    }
}
