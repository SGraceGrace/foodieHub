package com.project.foodservice.service.impl;

import com.project.foodservice.document.Rating;
import com.project.foodservice.document.Restaurant;
import com.project.foodservice.dto.PaginatedResponse;
import com.project.foodservice.dto.RatingResponseDTO;
import com.project.foodservice.repo.RatingRepo;
import com.project.foodservice.repo.RestaurantRepo;
import com.project.foodservice.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RatingServiceImpl implements RatingService {

    private final RatingRepo ratingRepo;
    private final RestaurantRepo restaurantRepo;

    @Override
    public PaginatedResponse<RatingResponseDTO> getMyRatings(String customerId, Pageable pageable) {
        Page<Rating> page = ratingRepo.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);

        List<String> restaurantIds = page.getContent().stream()
                .map(Rating::getRestaurantId)
                .distinct()
                .collect(Collectors.toList());

        Map<String, Restaurant> restaurantMap = restaurantRepo.findAllById(restaurantIds)
                .stream()
                .collect(Collectors.toMap(Restaurant::getId, r -> r));

        List<RatingResponseDTO> dtos = page.getContent().stream()
                .map(rating -> {
                    Restaurant r = restaurantMap.get(rating.getRestaurantId());
                    return new RatingResponseDTO(
                            rating.getId(),
                            rating.getRestaurantId(),
                            r != null ? r.getName() : "Unknown Restaurant",
                            r != null ? r.getImageUrl() : null,
                            rating.getOrderId(),
                            rating.getRating(),
                            rating.getDriverRating(),
                            rating.getCreatedAt()
                    );
                })
                .collect(Collectors.toList());

        return new PaginatedResponse<>(dtos,
                page.getNumber(),
                page.getTotalPages(),
                page.getTotalElements(),
                page.getSize());
    }
}
