package com.project.orderservice.controller;

import com.project.orderservice.document.Cart;
import com.project.orderservice.dto.AddToCartRequest;
import com.project.orderservice.dto.BaseAPIResponse;
import com.project.orderservice.dto.RemoveFromCartRequest;
import com.project.orderservice.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@PreAuthorize("hasRole('CUSTOMER')")
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    /** GET /api/cart — fetch the current user's cart */
    @GetMapping
    public ResponseEntity<BaseAPIResponse> getCart(
            @RequestHeader("X-User-Id") String userId) {

        Cart cart = cartService.getCart(userId);
        BaseAPIResponse response = new BaseAPIResponse("Cart fetched", cart, HttpStatus.OK.value(), null);
        return ResponseEntity.ok(response);
    }

    /** POST /api/cart/add — add one unit of an item */
    @PostMapping("/add")
    public ResponseEntity<BaseAPIResponse> addItem(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody AddToCartRequest request) {

        Cart cart = cartService.addItem(userId, request);
        BaseAPIResponse response = new BaseAPIResponse("Item added to cart", cart, HttpStatus.OK.value(), null);
        return ResponseEntity.ok(response);
    }

    /** POST /api/cart/remove — remove one unit of an item (deletes item/restaurant when qty hits 0) */
    @PostMapping("/remove")
    public ResponseEntity<BaseAPIResponse> removeItem(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody RemoveFromCartRequest request) {

        Cart cart = cartService.removeItem(userId, request);
        BaseAPIResponse response = new BaseAPIResponse("Item removed from cart", cart, HttpStatus.OK.value(), null);
        return ResponseEntity.ok(response);
    }

    /** DELETE /api/cart/restaurant/{restaurantId} — remove all items for one restaurant */
    @DeleteMapping("/restaurant/{restaurantId}")
    public ResponseEntity<BaseAPIResponse> clearRestaurant(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String restaurantId) {

        cartService.clearRestaurant(userId, restaurantId);
        BaseAPIResponse response = new BaseAPIResponse("Restaurant removed from cart", null, HttpStatus.OK.value(), null);
        return ResponseEntity.ok(response);
    }

    /** DELETE /api/cart/clear — wipe the entire cart */
    @DeleteMapping("/clear")
    public ResponseEntity<BaseAPIResponse> clearCart(
            @RequestHeader("X-User-Id") String userId) {

        cartService.clearCart(userId);
        BaseAPIResponse response = new BaseAPIResponse("Cart cleared", null, HttpStatus.OK.value(), null);
        return ResponseEntity.ok(response);
    }
}
