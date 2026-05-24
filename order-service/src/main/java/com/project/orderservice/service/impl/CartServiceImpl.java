package com.project.orderservice.service.impl;

import com.project.orderservice.document.Cart;
import com.project.orderservice.document.CartItem;
import com.project.orderservice.document.RestaurantCart;
import com.project.orderservice.dto.AddToCartRequest;
import com.project.orderservice.dto.RemoveFromCartRequest;
import com.project.orderservice.repo.CartRepository;
import com.project.orderservice.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;

    @Override
    public Cart getCart(String userId) {
        return cartRepository.findByUserId(userId)
                .orElse(emptyCart(userId));
    }

    @Override
    public Cart addItem(String userId, AddToCartRequest req) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseGet(() -> newCart(userId));

        // Find or create the restaurant bucket
        RestaurantCart restaurantCart = cart.getRestaurants().stream()
                .filter(r -> r.getRestaurantId().equals(req.getRestaurantId()))
                .findFirst()
                .orElseGet(() -> {
                    RestaurantCart rc = new RestaurantCart();
                    rc.setRestaurantId(req.getRestaurantId());
                    rc.setRestaurantName(req.getRestaurantName());
                    cart.getRestaurants().add(rc);
                    return rc;
                });

        // Find or create the item inside that restaurant bucket
        Optional<CartItem> existingItem = restaurantCart.getItems().stream()
                .filter(i -> i.getName().equals(req.getName()))
                .findFirst();

        if (existingItem.isPresent()) {
            existingItem.get().setQty(existingItem.get().getQty() + 1);
        } else {
            CartItem item = new CartItem();
            item.setMenuItemId(req.getMenuItemId());   // null for pre-migration items
            item.setName(req.getName());
            item.setPrice(req.getPrice());
            item.setQty(1);
            item.setVeg(req.isVeg());
            item.setDescription(req.getDescription());
            item.setImageUrl(req.getImageUrl());
            restaurantCart.getItems().add(item);
        }

        cart.setUpdatedAt(LocalDateTime.now());
        return cartRepository.save(cart);
    }

    @Override
    public Cart removeItem(String userId, RemoveFromCartRequest req) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseGet(() -> newCart(userId));

        cart.getRestaurants().stream()
                .filter(r -> r.getRestaurantId().equals(req.getRestaurantId()))
                .findFirst()
                .ifPresent(restaurantCart -> {
                    restaurantCart.getItems().stream()
                            .filter(i -> i.getName().equals(req.getName()))
                            .findFirst()
                            .ifPresent(item -> {
                                if (item.getQty() > 1) {
                                    item.setQty(item.getQty() - 1);
                                } else {
                                    // Remove the item entirely
                                    restaurantCart.getItems().remove(item);
                                }
                            });

                    // If restaurant has no items left, remove the restaurant bucket
                    if (restaurantCart.getItems().isEmpty()) {
                        cart.getRestaurants().remove(restaurantCart);
                    }
                });

        cart.setUpdatedAt(LocalDateTime.now());
        return cartRepository.save(cart);
    }

    @Override
    public void clearRestaurant(String userId, String restaurantId) {
        cartRepository.findByUserId(userId).ifPresent(cart -> {
            cart.getRestaurants().removeIf(r -> r.getRestaurantId().equals(restaurantId));
            cart.setUpdatedAt(LocalDateTime.now());
            cartRepository.save(cart);
        });
    }

    @Override
    public void clearCart(String userId) {
        cartRepository.deleteByUserId(userId);
    }

    // ── helpers ──────────────────────────────────────────────────────

    private Cart newCart(String userId) {
        Cart cart = new Cart();
        cart.setUserId(userId);
        return cart;
    }

    private Cart emptyCart(String userId) {
        Cart cart = new Cart();
        cart.setUserId(userId);
        return cart;   // not saved — just returned as empty response
    }
}
