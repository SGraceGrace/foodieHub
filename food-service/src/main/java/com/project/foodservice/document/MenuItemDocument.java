package com.project.foodservice.document;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

/**
 * Separate document for menu items — moved out of the embedded Restaurant.menu list.
 * Giving each item its own document means:
 *   1. Every item has a stable ID → Angular sends menuItemId when adding to cart
 *   2. Order analytics are tracked per item: orderCount, totalQuantity, totalRevenue
 *      (incremented by MenuOrderCountListener when order.placed fires from RabbitMQ)
 */
@Document(collection = "menu_items")
@Data
public class MenuItemDocument {

    @Id
    private String id;

    private String restaurantId;
    private String category;      // e.g. "Main Course", "Starters"

    // ── Core menu data (mirrors embedded MenuItem) ───────────────────
    private String name;
    private double price;
    private int gstPercent;
    private boolean isVeg;
    private boolean available = true;
    private String description;
    private String imageUrl;
    private List<MenuExtra> extras;

    // ── Order analytics (updated on every order.placed event) ────────
    /** Number of orders that included this item (one increment per order, regardless of qty). */
    private long orderCount = 0;

    /** Total units of this item ordered across all orders. */
    private long totalQuantity = 0;

    /** Total revenue generated: sum of (price × qty) across all orders. */
    private double totalRevenue = 0;
}
