package com.project.foodservice.controller;

import com.project.foodservice.constants.CommonConstants;
import com.project.foodservice.dto.BaseAPIResponse;
import com.project.foodservice.service.RestaurantService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/admin/restaurants")
@RequiredArgsConstructor
public class AdminRestaurantController {

    private final RestaurantService restaurantService;

    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
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
}
