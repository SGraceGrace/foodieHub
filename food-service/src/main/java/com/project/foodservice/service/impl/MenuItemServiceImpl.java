package com.project.foodservice.service.impl;

import com.project.foodservice.document.MenuCategory;
import com.project.foodservice.document.MenuItem;
import com.project.foodservice.document.MenuItemDocument;
import com.project.foodservice.repo.MenuItemRepo;
import com.project.foodservice.service.MenuItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class MenuItemServiceImpl implements MenuItemService {

    private final MenuItemRepo menuItemRepo;

    // ── Reads ────────────────────────────────────────────────────────

    @Override
    public List<MenuCategory> getMenu(String restaurantId) {
        List<MenuItemDocument> docs = menuItemRepo.findByRestaurantIdOrderByCategory(restaurantId);

        // Group by category preserving insertion order within each category
        Map<String, List<MenuItem>> grouped = new LinkedHashMap<>();
        for (MenuItemDocument doc : docs) {
            grouped.computeIfAbsent(doc.getCategory(), k -> new ArrayList<>())
                   .add(toMenuItem(doc));
        }

        return grouped.entrySet().stream()
                .map(e -> {
                    MenuCategory mc = new MenuCategory();
                    mc.setCategory(e.getKey());
                    mc.setItems(e.getValue());
                    return mc;
                })
                .collect(Collectors.toList());
    }

    // ── Writes ───────────────────────────────────────────────────────

    @Override
    public void saveFullMenu(String restaurantId, List<MenuCategory> categories) {
        if (categories == null || categories.isEmpty()) {
            menuItemRepo.deleteByRestaurantId(restaurantId);
            return;
        }

        // Build a lookup of existing docs by ID so we can update in-place (preserving order stats)
        List<MenuItemDocument> existingDocs = menuItemRepo.findByRestaurantIdOrderByCategory(restaurantId);
        Map<String, MenuItemDocument> existingById = existingDocs.stream()
                .filter(d -> d.getId() != null)
                .collect(Collectors.toMap(MenuItemDocument::getId, Function.identity()));

        Set<String> processedIds = new HashSet<>();
        List<MenuItemDocument> toSave = new ArrayList<>();

        for (MenuCategory cat : categories) {
            if (cat.getItems() == null) continue;
            for (MenuItem item : cat.getItems()) {
                if (item.getId() != null && existingById.containsKey(item.getId())) {
                    // Existing item — update fields, keep orderCount / totalQuantity / totalRevenue intact
                    MenuItemDocument existing = existingById.get(item.getId());
                    existing.setCategory(cat.getCategory());
                    existing.setName(item.getName());
                    existing.setPrice(item.getPrice());
                    existing.setGstPercent(item.getGstPercent());
                    existing.setVeg(item.isVeg());
                    existing.setAvailable(item.isAvailable());
                    existing.setDescription(item.getDescription());
                    existing.setImageUrl(item.getImageUrl());
                    existing.setExtras(item.getExtras());
                    toSave.add(existing);
                    processedIds.add(item.getId());
                } else {
                    // New item — create fresh (no ID)
                    toSave.add(toDocument(restaurantId, cat.getCategory(), item));
                }
            }
        }

        // Delete items that were removed (existed before but not in the incoming payload)
        existingDocs.stream()
                .filter(d -> d.getId() != null && !processedIds.contains(d.getId()))
                .forEach(menuItemRepo::delete);

        menuItemRepo.saveAll(toSave);
    }

    @Override
    public MenuItemDocument addItem(String restaurantId, String category, MenuItemDocument item) {
        item.setRestaurantId(restaurantId);
        item.setCategory(category);
        return menuItemRepo.save(item);
    }

    @Override
    public MenuItemDocument updateItem(String restaurantId, String itemId, MenuItemDocument update) {
        MenuItemDocument existing = menuItemRepo.findByIdAndRestaurantId(itemId, restaurantId)
                .orElseThrow(() -> new RuntimeException("Menu item not found: " + itemId));
        // Carry over the ID, restaurant, and analytics — never reset stats on an edit
        update.setId(existing.getId());
        update.setRestaurantId(restaurantId);
        update.setOrderCount(existing.getOrderCount());
        update.setTotalQuantity(existing.getTotalQuantity());
        update.setTotalRevenue(existing.getTotalRevenue());
        return menuItemRepo.save(update);
    }

    @Override
    public void deleteItem(String restaurantId, String itemId) {
        menuItemRepo.findByIdAndRestaurantId(itemId, restaurantId)
                .ifPresent(menuItemRepo::delete);
    }

    // ── Analytics ────────────────────────────────────────────────────

    @Override
    public void incrementOrderCount(String menuItemId, int qty, double price) {
        menuItemRepo.findById(menuItemId).ifPresent(item -> {
            item.setOrderCount(item.getOrderCount() + 1);
            item.setTotalQuantity(item.getTotalQuantity() + qty);
            item.setTotalRevenue(item.getTotalRevenue() + (price * qty));
            menuItemRepo.save(item);
        });
    }

    // ── Migration ────────────────────────────────────────────────────

    @Override
    public int migrateFromEmbedded(String restaurantId, List<MenuCategory> embeddedMenu) {
        if (embeddedMenu == null || embeddedMenu.isEmpty()) return 0;
        // Idempotent — if items already exist, skip this restaurant
        if (!menuItemRepo.findByRestaurantIdOrderByCategory(restaurantId).isEmpty()) return 0;

        saveFullMenu(restaurantId, embeddedMenu);
        return (int) embeddedMenu.stream()
                .mapToLong(c -> c.getItems() == null ? 0 : c.getItems().size())
                .sum();
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /**
     * Convert document → embedded MenuItem response.
     * The `id` field is set so Angular can pass it back when adding to cart.
     */
    private MenuItem toMenuItem(MenuItemDocument doc) {
        MenuItem m = new MenuItem();
        m.setId(doc.getId());
        m.setName(doc.getName());
        m.setPrice(doc.getPrice());
        m.setGstPercent(doc.getGstPercent());
        m.setVeg(doc.isVeg());
        m.setAvailable(doc.isAvailable());
        m.setDescription(doc.getDescription());
        m.setImageUrl(doc.getImageUrl());
        m.setExtras(doc.getExtras());
        return m;
    }

    /**
     * Convert embedded MenuItem → new document.
     * If the item already has an id (e.g. during saveFullMenu after migration), preserve it.
     */
    private MenuItemDocument toDocument(String restaurantId, String category, MenuItem item) {
        MenuItemDocument doc = new MenuItemDocument();
        if (item.getId() != null && !item.getId().isBlank()) doc.setId(item.getId());
        doc.setRestaurantId(restaurantId);
        doc.setCategory(category);
        doc.setName(item.getName());
        doc.setPrice(item.getPrice());
        doc.setGstPercent(item.getGstPercent());
        doc.setVeg(item.isVeg());
        doc.setAvailable(item.isAvailable());
        doc.setDescription(item.getDescription());
        doc.setImageUrl(item.getImageUrl());
        doc.setExtras(item.getExtras());
        return doc;
    }
}
