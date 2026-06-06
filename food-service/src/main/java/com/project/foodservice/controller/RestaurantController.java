package com.project.foodservice.controller;

import com.project.foodservice.document.DaySchedule;
import com.project.foodservice.document.MenuCategory;
import com.project.foodservice.constants.CommonConstants;
import com.project.foodservice.dto.BaseAPIResponse;
import com.project.foodservice.dto.RatingRequest;
import com.project.foodservice.dto.RestaurantCreateRequestDTO;
import com.project.foodservice.dto.RestaurantUpdateRequestDTO;
import com.project.foodservice.service.MenuItemService;
import com.project.foodservice.service.RestaurantService;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/restaurants")
@RequiredArgsConstructor
public class RestaurantController {

    private final RestaurantService restaurantService;
    private final MenuItemService menuItemService;

    @GetMapping
    public ResponseEntity<BaseAPIResponse> getAll(
            @RequestParam(required = false) String cuisine,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) Double radiusKm,
            @RequestParam(defaultValue = "relevance") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                restaurantService.getAll(cuisine, lat, lng, radiusKm, sort, PageRequest.of(page, size)),
                HttpStatus.OK.value(), null));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseAPIResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS, restaurantService.getById(id), HttpStatus.OK.value(), null));
    }

    @GetMapping("/cuisines")
    public ResponseEntity<BaseAPIResponse> getCuisines() {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS, restaurantService.getCuisines(), HttpStatus.OK.value(), null));
    }

    @PostMapping
    public ResponseEntity<BaseAPIResponse> create(@RequestBody RestaurantCreateRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BaseAPIResponse(CommonConstants.SUCCESS, restaurantService.create(request), HttpStatus.CREATED.value(), null));
    }

    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<BaseAPIResponse> getByOwner(
            @PathVariable String ownerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                restaurantService.getByOwner(ownerId, PageRequest.of(page, size)),
                HttpStatus.OK.value(), null));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseAPIResponse> updateDetails(
            @PathVariable String id,
            @RequestBody RestaurantUpdateRequestDTO request) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                restaurantService.updateDetails(id, request),
                HttpStatus.OK.value(), null));
    }

    @PutMapping("/{id}/hours")
    public ResponseEntity<BaseAPIResponse> updateHours(
            @PathVariable String id,
            @RequestBody List<DaySchedule> hours) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                restaurantService.updateHours(id, hours),
                HttpStatus.OK.value(), null));
    }

    /**
     * Partner — batch-save the full menu for a restaurant.
     * Writes to the menu_items collection (replaces all existing items).
     * Returns the newly saved menu grouped by category.
     */
    @PutMapping("/{id}/menu")
    public ResponseEntity<BaseAPIResponse> updateMenu(
            @PathVariable String id,
            @RequestBody List<MenuCategory> menu) {
        menuItemService.saveFullMenu(id, menu);
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                menuItemService.getMenu(id),
                HttpStatus.OK.value(), null));
    }

    /**
     * POST /api/v1/restaurants/{id}/rating
     * Customer submits a 1–5 star rating tied to a specific order.
     * X-User-Id header is injected by the API Gateway from the verified JWT.
     * One rating per order — duplicate submissions return 409.
     */
    @PostMapping("/{id}/rating")
    public ResponseEntity<BaseAPIResponse> addRating(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String customerId,
            @RequestBody RatingRequest req) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                restaurantService.addRating(id, req.rating(), customerId,
                        req.orderId(), req.driverEmail(), req.driverRating()),
                HttpStatus.OK.value(), null));
    }
}
