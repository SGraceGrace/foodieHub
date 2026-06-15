package com.project.foodservice.controller;

import com.project.foodservice.constants.CommonConstants;
import com.project.foodservice.dto.BaseAPIResponse;
import com.project.foodservice.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@PreAuthorize("hasRole('END_USERS')")
@RestController
@RequestMapping("/api/v1/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    public ResponseEntity<BaseAPIResponse> getWishlist(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse(
                CommonConstants.SUCCESS,
                wishlistService.getWishlist(userId, page, size),
                HttpStatus.OK.value(),
                null));
    }

    @PostMapping("/{restaurantId}")
    public ResponseEntity<BaseAPIResponse> add(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String restaurantId) {
        wishlistService.add(userId, restaurantId);
        return ResponseEntity.ok(new BaseAPIResponse(
                CommonConstants.SUCCESS, null, HttpStatus.OK.value(), null));
    }

    @DeleteMapping("/{restaurantId}")
    public ResponseEntity<BaseAPIResponse> remove(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String restaurantId) {
        wishlistService.remove(userId, restaurantId);
        return ResponseEntity.ok(new BaseAPIResponse(
                CommonConstants.SUCCESS, null, HttpStatus.OK.value(), null));
    }

    @GetMapping("/{restaurantId}/status")
    public ResponseEntity<BaseAPIResponse> status(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String restaurantId) {
        boolean saved = wishlistService.isSaved(userId, restaurantId);
        return ResponseEntity.ok(new BaseAPIResponse(
                CommonConstants.SUCCESS,
                Map.of("saved", saved),
                HttpStatus.OK.value(),
                null));
    }
}
