package com.project.foodservice.service;

import com.project.foodservice.dto.PaginatedResponse;
import com.project.foodservice.dto.RatingResponseDTO;
import org.springframework.data.domain.Pageable;

public interface RatingService {
    PaginatedResponse<RatingResponseDTO> getMyRatings(String customerId, Pageable pageable);
}
