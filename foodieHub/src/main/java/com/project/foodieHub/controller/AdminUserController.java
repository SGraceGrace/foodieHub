package com.project.foodieHub.controller;

import com.project.foodieHub.constants.CommonConstants;
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
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BaseAPIResponse> getUsers(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                adminUserService.getUsers(status, search, role, page, size), HttpStatus.OK.value(), null));
    }

    @PostMapping("api/v1/admin/users/create-admin")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BaseAPIResponse> createAdmin(@RequestBody CreateAdminRequestDTO request) {
        return ResponseEntity.ok(new BaseAPIResponse("Admin user created",
                adminUserService.createAdmin(request), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/users/{id}/suspend")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BaseAPIResponse> suspend(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseAPIResponse("User suspended",
                adminUserService.suspendUser(id), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/users/{id}/unsuspend")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BaseAPIResponse> unsuspend(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseAPIResponse("User unsuspended",
                adminUserService.unsuspendUser(id), HttpStatus.OK.value(), null));
    }

    @GetMapping("api/v1/admin/activity-logs")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BaseAPIResponse> getActivityLogs() {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                adminUserService.getActivityLogs(), HttpStatus.OK.value(), null));
    }

    @GetMapping("api/v1/admin/restaurant-owners")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BaseAPIResponse> getRestaurantOwners(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                adminUserService.getRestaurantOwners(status, page, size), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/restaurant-owners/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BaseAPIResponse> approveOwner(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseAPIResponse("Owner approved",
                adminUserService.approveOwner(id), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/restaurant-owners/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BaseAPIResponse> rejectOwner(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseAPIResponse("Owner rejected",
                adminUserService.rejectOwner(id), HttpStatus.OK.value(), null));
    }

    @GetMapping("api/v1/admin/drivers")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BaseAPIResponse> getDrivers(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                adminUserService.getDrivers(status, search, page, size), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/drivers/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BaseAPIResponse> approveDriver(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseAPIResponse("Driver approved",
                adminUserService.approveDriver(id), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/drivers/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BaseAPIResponse> rejectDriver(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseAPIResponse("Driver rejected",
                adminUserService.rejectDriver(id), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/drivers/{id}/suspend")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BaseAPIResponse> suspendDriver(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseAPIResponse("Driver suspended",
                adminUserService.suspendDriver(id), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/drivers/{id}/unsuspend")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BaseAPIResponse> unsuspendDriver(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseAPIResponse("Driver unsuspended",
                adminUserService.unsuspendDriver(id), HttpStatus.OK.value(), null));
    }
}
