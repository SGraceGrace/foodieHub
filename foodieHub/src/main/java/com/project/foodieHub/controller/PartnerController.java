package com.project.foodieHub.controller;

import com.project.foodieHub.constants.CommonConstants;
import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.CreateRestaurantStaffRequestDTO;
import com.project.foodieHub.dto.PartnerRegisterRequestDTO;
import com.project.foodieHub.service.PartnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class PartnerController {

    private final PartnerService partnerService;

    @PostMapping("api/v1/partner/register")
    public ResponseEntity<BaseAPIResponse> register(@RequestBody PartnerRegisterRequestDTO dto) {
        partnerService.register(dto);
        return ResponseEntity.ok(new BaseAPIResponse(
                "Registration successful. Your account is under review. We'll notify you once approved.",
                null, HttpStatus.OK.value(), null));
    }

    @GetMapping("api/v1/partner/restaurants/{restaurantId}/staff")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<BaseAPIResponse> getStaff(@PathVariable String restaurantId) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                partnerService.getStaff(restaurantId), HttpStatus.OK.value(), null));
    }

    @PostMapping("api/v1/partner/staff")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<BaseAPIResponse> createStaff(@RequestBody CreateRestaurantStaffRequestDTO dto) {
        return ResponseEntity.ok(new BaseAPIResponse("Staff user created",
                partnerService.createStaff(dto), HttpStatus.OK.value(), null));
    }

    @DeleteMapping("api/v1/partner/staff/{staffId}")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<BaseAPIResponse> archiveStaff(@PathVariable Long staffId) {
        partnerService.archiveStaff(staffId);
        return ResponseEntity.ok(new BaseAPIResponse("Staff user archived",
                null, HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/partner/staff/{staffId}/activate")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<BaseAPIResponse> activateStaff(@PathVariable Long staffId) {
        partnerService.activateStaff(staffId);
        return ResponseEntity.ok(new BaseAPIResponse("Staff user activated",
                null, HttpStatus.OK.value(), null));
    }
}
