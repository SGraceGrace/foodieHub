package com.project.foodservice.controller;

import com.project.foodservice.document.Restaurant;
import com.project.foodservice.constants.CommonConstants;
import com.project.foodservice.dto.BaseAPIResponse;
import com.project.foodservice.repo.RestaurantRepo;
import com.project.foodservice.service.MenuItemService;
import com.project.foodservice.service.RestaurantService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("api/v1/admin/restaurants")
@RequiredArgsConstructor
public class AdminRestaurantController {

    private final RestaurantService restaurantService;
    private final MenuItemService menuItemService;
    private final RestaurantRepo restaurantRepo;

    @GetMapping
    public ResponseEntity<BaseAPIResponse> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String cuisine,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                restaurantService.getAllForAdmin(status, cuisine, PageRequest.of(page, size)),
                HttpStatus.OK.value(), null));
    }

    /**
     * One-time migration: reads each restaurant's embedded menu and writes the items
     * to the menu_items collection.  Idempotent — restaurants already migrated are skipped.
     *
     * POST /api/v1/admin/restaurants/migrate-menus
     *
     * Returns: { restaurantsMigrated, itemsMigrated, restaurantsSkipped }
     */
    @PostMapping("/migrate-menus")
    public ResponseEntity<BaseAPIResponse> migrateMenus() {
        List<Restaurant> all = restaurantRepo.findAll();
        int restaurantsMigrated = 0;
        int itemsMigrated       = 0;
        int restaurantsSkipped  = 0;

        for (Restaurant r : all) {
            if (r.getMenu() == null || r.getMenu().isEmpty()) {
                restaurantsSkipped++;
                continue;
            }
            int count = menuItemService.migrateFromEmbedded(r.getId(), r.getMenu());
            if (count > 0) {
                restaurantsMigrated++;
                itemsMigrated += count;
            } else {
                restaurantsSkipped++;   // already migrated
            }
        }

        Map<String, Integer> result = new HashMap<>();
        result.put("restaurantsMigrated", restaurantsMigrated);
        result.put("itemsMigrated",       itemsMigrated);
        result.put("restaurantsSkipped",  restaurantsSkipped);

        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS, result, HttpStatus.OK.value(), null));
    }
}
