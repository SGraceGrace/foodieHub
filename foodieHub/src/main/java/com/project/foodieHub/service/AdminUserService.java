package com.project.foodieHub.service;

import com.project.foodieHub.dto.ActivityLogDTO;
import com.project.foodieHub.dto.AdminUserResponseDTO;
import com.project.foodieHub.dto.CreateAdminRequestDTO;
import com.project.foodieHub.dto.PaginatedResponse;

import java.util.List;

public interface AdminUserService {
    PaginatedResponse<AdminUserResponseDTO> getUsers(String status, String search, String role, int page, int size);
    AdminUserResponseDTO suspendUser(Long id);
    AdminUserResponseDTO unsuspendUser(Long id);
    AdminUserResponseDTO createAdmin(CreateAdminRequestDTO request);
    List<ActivityLogDTO> getActivityLogs();
    PaginatedResponse<AdminUserResponseDTO> getRestaurantOwners(String status, int page, int size);
    AdminUserResponseDTO approveOwner(Long id);
    AdminUserResponseDTO rejectOwner(Long id);
    PaginatedResponse<AdminUserResponseDTO> getDrivers(String status, int page, int size);
    AdminUserResponseDTO approveDriver(Long id);
    AdminUserResponseDTO rejectDriver(Long id);
}
