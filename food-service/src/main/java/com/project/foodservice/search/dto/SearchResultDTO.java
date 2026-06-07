package com.project.foodservice.search.dto;

import java.util.List;

/**
 * Response from GET /api/search?q=...
 * Contains both restaurant-level and menu-item-level matches so the UI can
 * render two separate sections in one API call.
 */
public record SearchResultDTO(
        List<RestaurantResult> restaurants,
        List<MenuItemResult>   menuItems
) {

    public record RestaurantResult(
            String       id,
            String       name,
            String       address,
            List<String> cuisine,
            double       rating,
            int          ratingCount,
            int          deliveryTime,
            int          minOrder,
            String       priceRange,
            boolean      open,
            String       imageUrl
    ) {}

    public record MenuItemResult(
            String  id,
            String  restaurantId,
            String  restaurantName,
            String  category,
            String  name,
            double  price,
            boolean veg,
            String  description,
            String  imageUrl
    ) {}
}
