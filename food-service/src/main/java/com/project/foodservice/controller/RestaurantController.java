package com.project.foodservice.controller;

import com.project.foodservice.document.DaySchedule;
import com.project.foodservice.document.MenuCategory;
import com.project.foodservice.dto.BaseAPIResponse;
import com.project.foodservice.dto.RatingRequest;
import com.project.foodservice.dto.RestaurantCreateRequestDTO;
import com.project.foodservice.dto.RestaurantUpdateRequestDTO;
import com.project.foodservice.service.RestaurantService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/v1/restaurants")
@RequiredArgsConstructor
public class RestaurantController {

    private final RestaurantService restaurantService;

    @GetMapping
    public ResponseEntity<BaseAPIResponse> getAll(
            @RequestParam(required = false) String cuisine,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) Double radiusKm,
            @RequestParam(defaultValue = "relevance") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS",
                restaurantService.getAll(cuisine, lat, lng, radiusKm, sort, PageRequest.of(page, size)),
                HttpStatus.OK.value(), null));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseAPIResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS", restaurantService.getById(id), HttpStatus.OK.value(), null));
    }

    @GetMapping("/cuisines")
    public ResponseEntity<BaseAPIResponse> getCuisines() {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS", restaurantService.getCuisines(), HttpStatus.OK.value(), null));
    }

    @PostMapping
    public ResponseEntity<BaseAPIResponse> create(@RequestBody RestaurantCreateRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BaseAPIResponse("SUCCESS", restaurantService.create(request), HttpStatus.CREATED.value(), null));
    }

    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<BaseAPIResponse> getByOwner(
            @PathVariable String ownerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS",
                restaurantService.getByOwner(ownerId, PageRequest.of(page, size)),
                HttpStatus.OK.value(), null));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseAPIResponse> updateDetails(
            @PathVariable String id,
            @RequestBody RestaurantUpdateRequestDTO request) {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS",
                restaurantService.updateDetails(id, request),
                HttpStatus.OK.value(), null));
    }

    @PutMapping("/{id}/hours")
    public ResponseEntity<BaseAPIResponse> updateHours(
            @PathVariable String id,
            @RequestBody List<DaySchedule> hours) {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS",
                restaurantService.updateHours(id, hours),
                HttpStatus.OK.value(), null));
    }

    @PutMapping("/{id}/menu")
    public ResponseEntity<BaseAPIResponse> updateMenu(
            @PathVariable String id,
            @RequestBody List<MenuCategory> menu) {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS",
                restaurantService.updateMenu(id, menu),
                HttpStatus.OK.value(), null));
    }

    /**
     * POST /api/v1/restaurants/{id}/rating
     * Customer submits a 1–5 star rating; weighted average is applied server-side.
     */
    @PostMapping("/{id}/rating")
    public ResponseEntity<BaseAPIResponse> addRating(
            @PathVariable String id,
            @RequestBody RatingRequest req) {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS",
                restaurantService.addRating(id, req.rating()),
                HttpStatus.OK.value(), null));
    }
}
