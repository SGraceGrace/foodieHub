package com.project.foodservice.service;

import com.project.foodservice.document.MenuCategory;
import com.project.foodservice.document.MenuItemDocument;

import java.util.List;

public interface MenuItemService {

    /** Full menu grouped by category — used by restaurant-detail page. Items include their DB id. */
    List<MenuCategory> getMenu(String restaurantId);

    /**
     * Batch-save: deletes all existing items for the restaurant and replaces with the supplied list.
     * Used by the partner workspace "Save Menu" action.
     */
    void saveFullMenu(String restaurantId, List<MenuCategory> categories);

    /** Add a single item to a specific category. */
    MenuItemDocument addItem(String restaurantId, String category, MenuItemDocument item);

    /** Update an existing item — preserves order analytics stats. */
    MenuItemDocument updateItem(String restaurantId, String itemId, MenuItemDocument update);

    /** Delete a single item. */
    void deleteItem(String restaurantId, String itemId);

    /**
     * Increment order analytics for a menu item.
     * Called by MenuOrderCountListener on every order.placed RabbitMQ event.
     */
    void incrementOrderCount(String menuItemId, int qty, double price);

    /**
     * One-time migration: reads existing embedded menu data and saves each item to menu_items.
     * Idempotent — skips restaurants that already have items in the collection.
     * Returns the number of items migrated.
     */
    int migrateFromEmbedded(String restaurantId, List<MenuCategory> embeddedMenu);
}
