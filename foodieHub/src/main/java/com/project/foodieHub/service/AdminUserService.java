package com.project.foodieHub.service;

import com.project.foodieHub.dto.AdminUserResponseDTO;

import java.util.List;

public interface AdminUserService {
    List<AdminUserResponseDTO> getUsers(String status, String search);
    AdminUserResponseDTO suspendUser(Long id);
    AdminUserResponseDTO unsuspendUser(Long id);
}
