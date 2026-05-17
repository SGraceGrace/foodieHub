package com.project.foodservice.controller;

import com.project.foodservice.dto.BaseAPIResponse;
import com.project.foodservice.service.RestaurantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/restaurants")
@RequiredArgsConstructor
public class RestaurantController {

    private final RestaurantService restaurantService;

    @GetMapping
    public ResponseEntity<BaseAPIResponse> getAll(
            @RequestParam(required = false) String cuisine) {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS", restaurantService.getAll(cuisine), HttpStatus.OK.value(), null));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseAPIResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS", restaurantService.getById(id), HttpStatus.OK.value(), null));
    }

    @GetMapping("/cuisines")
    public ResponseEntity<BaseAPIResponse> getCuisines() {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS", restaurantService.getCuisines(), HttpStatus.OK.value(), null));
    }
}
