package com.project.foodservice.service.impl;

import com.project.foodservice.document.Restaurant;
import com.project.foodservice.document.Wishlist;
import com.project.foodservice.dto.PaginatedResponse;
import com.project.foodservice.repo.RestaurantRepo;
import com.project.foodservice.repo.WishlistRepo;
import com.project.foodservice.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WishlistServiceImpl implements WishlistService {

    private final WishlistRepo wishlistRepo;
    private final RestaurantRepo restaurantRepo;

    @Override
    public PaginatedResponse<Restaurant> getWishlist(String userId, int page, int size) {
        Page<Wishlist> wishlistPage = wishlistRepo.findByUserId(userId, PageRequest.of(page, size));

        List<String> restaurantIds = wishlistPage.getContent().stream()
                .map(Wishlist::getRestaurantId)
                .collect(Collectors.toList());

        Map<String, Restaurant> restaurantMap = restaurantRepo.findAllById(restaurantIds)
                .stream()
                .collect(Collectors.toMap(Restaurant::getId, r -> r));

        // preserve the wishlist order (most recently saved first)
        List<Restaurant> restaurants = wishlistPage.getContent().stream()
                .map(w -> restaurantMap.get(w.getRestaurantId()))
                .filter(r -> r != null)
                .collect(Collectors.toList());

        Page<Restaurant> resultPage = new PageImpl<>(restaurants, wishlistPage.getPageable(), wishlistPage.getTotalElements());
        return PaginatedResponse.of(resultPage);
    }

    @Override
    public void add(String userId, String restaurantId) {
        if (!wishlistRepo.existsByUserIdAndRestaurantId(userId, restaurantId)) {
            Wishlist entry = new Wishlist();
            entry.setUserId(userId);
            entry.setRestaurantId(restaurantId);
            wishlistRepo.save(entry);
        }
    }

    @Override
    public void remove(String userId, String restaurantId) {
        wishlistRepo.deleteByUserIdAndRestaurantId(userId, restaurantId);
    }

    @Override
    public boolean isSaved(String userId, String restaurantId) {
        return wishlistRepo.existsByUserIdAndRestaurantId(userId, restaurantId);
    }
}
