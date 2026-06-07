package com.project.orderservice.service;

import com.project.orderservice.document.Cart;
import com.project.orderservice.dto.AddToCartRequest;
import com.project.orderservice.dto.RemoveFromCartRequest;

public interface CartService {
    Cart getCart(String userId);
    Cart addItem(String userId, AddToCartRequest request);
    Cart removeItem(String userId, RemoveFromCartRequest request);
    void clearRestaurant(String userId, String restaurantId);
    void clearCart(String userId);
}
