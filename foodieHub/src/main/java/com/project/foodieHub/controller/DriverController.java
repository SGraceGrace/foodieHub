package com.project.foodieHub.controller;

import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.DriverLocationDTO;
import com.project.foodieHub.dto.DriverProfileUpdateDTO;
import com.project.foodieHub.dto.DriverRegisterRequestDTO;
import com.project.foodieHub.service.DriverService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;

    @PostMapping("api/v1/driver/register")
    public ResponseEntity<BaseAPIResponse> register(@RequestBody DriverRegisterRequestDTO dto) {
        driverService.register(dto);
        return ResponseEntity.ok(new BaseAPIResponse(
                "Registration successful. Your account is under review. We'll notify you once approved.",
                null, HttpStatus.OK.value(), null));
    }

    @GetMapping("api/v1/driver/profile")
    public ResponseEntity<BaseAPIResponse> getProfile(
            @RequestHeader("X-User-Id") String email) {
        return ResponseEntity.ok(new BaseAPIResponse(
                null, driverService.getProfile(email), HttpStatus.OK.value(), null));
    }

    @PatchMapping("api/v1/driver/profile")
    public ResponseEntity<BaseAPIResponse> updateProfile(
            @RequestHeader("X-User-Id") String email,
            @RequestBody DriverProfileUpdateDTO dto) {
        return ResponseEntity.ok(new BaseAPIResponse(
                "Profile updated successfully.",
                driverService.updateProfile(email, dto), HttpStatus.OK.value(), null));
    }

    @PatchMapping("api/v1/driver/location")
    public ResponseEntity<BaseAPIResponse> updateLocation(
            @RequestHeader("X-User-Id") String email,
            @RequestBody DriverLocationDTO dto) {
        driverService.updateLocation(email, dto.getLat(), dto.getLng());
        return ResponseEntity.ok(new BaseAPIResponse(
                "Location updated.", null, HttpStatus.OK.value(), null));
    }

    /**
     * Internal service-to-service endpoint — called by notification-service to find
     * online drivers when a new order is placed. Not routed through the gateway.
     * Returns a plain list of driver emails (no auth needed — internal network only).
     */
    @GetMapping("api/v1/internal/drivers/online")
    public ResponseEntity<List<String>> getOnlineDriverEmails() {
        return ResponseEntity.ok(driverService.getOnlineDriverEmails());
    }

    @PatchMapping("api/v1/driver/availability")
    public ResponseEntity<BaseAPIResponse> setAvailability(
            @RequestHeader("X-User-Id") String email,
            @RequestBody Map<String, Boolean> body) {
        boolean online = Boolean.TRUE.equals(body.get("online"));
        driverService.setAvailability(email, online);
        return ResponseEntity.ok(new BaseAPIResponse(
                online ? "You are now online." : "You are now offline.",
                Map.of("online", online), HttpStatus.OK.value(), null));
    }
}
