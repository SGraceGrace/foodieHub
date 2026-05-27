package com.project.foodservice.search.service;

import com.project.foodservice.document.MenuItemDocument;
import com.project.foodservice.document.Restaurant;
import com.project.foodservice.search.dto.SearchResultDTO;

import java.util.List;

public interface SearchService {

    /** Full-text + fuzzy search across restaurants and menu items. */
    SearchResultDTO search(String query);

    /** Write-through: index (create/update) one restaurant in ES. */
    void indexRestaurant(Restaurant restaurant);

    /**
     * Write-through: replace all menu-item docs for a restaurant in ES.
     * Looks up restaurant name internally to denormalise into each item doc.
     *
     * @param restaurantId MongoDB ID of the restaurant
     * @param items        Full list of saved {@link MenuItemDocument}s (with IDs set)
     */
    void indexMenuItems(String restaurantId, List<MenuItemDocument> items);

    /**
     * Admin endpoint: re-reads every restaurant + menu from MongoDB and rebuilds all ES indices.
     *
     * @return number of restaurants reindexed
     */
    int reindex();
}
