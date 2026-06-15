package com.project.foodservice.controller;

import com.project.foodservice.constants.CommonConstants;
import com.project.foodservice.dto.BaseAPIResponse;
import com.project.foodservice.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@PreAuthorize("hasRole('END_USERS')")
@RestController
@RequestMapping("api/v1/ratings")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;

    @GetMapping
    public ResponseEntity<BaseAPIResponse> getMyRatings(
            @RequestHeader("X-User-Id") String customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse(
                CommonConstants.SUCCESS,
                ratingService.getMyRatings(customerId, PageRequest.of(page, size)),
                HttpStatus.OK.value(),
                null));
    }
}
