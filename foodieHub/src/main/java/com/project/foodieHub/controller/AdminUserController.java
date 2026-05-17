package com.project.foodieHub.controller;

import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.CreateAdminRequestDTO;
import com.project.foodieHub.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping("api/v1/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseAPIResponse> getUsers(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS",
                adminUserService.getUsers(status, search, role, page, size), HttpStatus.OK.value(), null));
    }

    @PostMapping("api/v1/admin/users/create-admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseAPIResponse> createAdmin(@RequestBody CreateAdminRequestDTO request) {
        return ResponseEntity.ok(new BaseAPIResponse("Admin user created",
                adminUserService.createAdmin(request), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/users/{id}/suspend")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseAPIResponse> suspend(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseAPIResponse("User suspended",
                adminUserService.suspendUser(id), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/users/{id}/unsuspend")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseAPIResponse> unsuspend(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseAPIResponse("User unsuspended",
                adminUserService.unsuspendUser(id), HttpStatus.OK.value(), null));
    }

    @GetMapping("api/v1/admin/activity-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseAPIResponse> getActivityLogs() {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS",
                adminUserService.getActivityLogs(), HttpStatus.OK.value(), null));
    }

    @GetMapping("api/v1/admin/restaurant-owners")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseAPIResponse> getRestaurantOwners(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS",
                adminUserService.getRestaurantOwners(status, page, size), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/restaurant-owners/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseAPIResponse> approveOwner(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseAPIResponse("Owner approved",
                adminUserService.approveOwner(id), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/restaurant-owners/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseAPIResponse> rejectOwner(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseAPIResponse("Owner rejected",
                adminUserService.rejectOwner(id), HttpStatus.OK.value(), null));
    }
}
