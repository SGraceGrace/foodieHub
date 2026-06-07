package com.project.foodservice.controller;

import com.project.foodservice.document.MenuItemDocument;
import com.project.foodservice.constants.CommonConstants;
import com.project.foodservice.dto.BaseAPIResponse;
import com.project.foodservice.service.MenuItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Menu endpoints — separated from RestaurantController so the menu
 * can evolve independently and the restaurant document stays lean.
 *
 * GET  /api/v1/restaurants/{id}/menu          → public (browse)
 * POST /api/v1/restaurants/{id}/menu/items    → partner (add item)
 * PUT  /api/v1/restaurants/{id}/menu/items/{itemId}  → partner (update)
 * DELETE /api/v1/restaurants/{id}/menu/items/{itemId} → partner (delete)
 */
@RestController
@RequiredArgsConstructor
public class MenuItemController {

    private final MenuItemService menuItemService;

    /**
     * Public — returns the full menu for a restaurant, grouped by category.
     * Each MenuItem in the response includes its `id` so Angular can send
     * menuItemId back when adding to the cart.
     */
    @GetMapping("api/v1/restaurants/{restaurantId}/menu")
    public ResponseEntity<BaseAPIResponse> getMenu(@PathVariable String restaurantId) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                menuItemService.getMenu(restaurantId),
                HttpStatus.OK.value(), null));
    }

    /** Partner — add a single item to a category. */
    @PostMapping("api/v1/restaurants/{restaurantId}/menu/items")
    public ResponseEntity<BaseAPIResponse> addItem(
            @PathVariable String restaurantId,
            @RequestParam String category,
            @RequestBody MenuItemDocument item) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BaseAPIResponse(CommonConstants.SUCCESS,
                        menuItemService.addItem(restaurantId, category, item),
                        HttpStatus.CREATED.value(), null));
    }

    /** Partner — update a single item (stats are preserved). */
    @PutMapping("api/v1/restaurants/{restaurantId}/menu/items/{itemId}")
    public ResponseEntity<BaseAPIResponse> updateItem(
            @PathVariable String restaurantId,
            @PathVariable String itemId,
            @RequestBody MenuItemDocument update) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                menuItemService.updateItem(restaurantId, itemId, update),
                HttpStatus.OK.value(), null));
    }

    /** Partner — delete a single item. */
    @DeleteMapping("api/v1/restaurants/{restaurantId}/menu/items/{itemId}")
    public ResponseEntity<BaseAPIResponse> deleteItem(
            @PathVariable String restaurantId,
            @PathVariable String itemId) {
        menuItemService.deleteItem(restaurantId, itemId);
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS, null, HttpStatus.OK.value(), null));
    }
}
