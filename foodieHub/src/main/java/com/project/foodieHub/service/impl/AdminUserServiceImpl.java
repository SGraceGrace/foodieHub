package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.AdminUserResponseDTO;
import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.UserStatus;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.repo.UserRepo;
import com.project.foodieHub.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepo userRepo;

    @Override
    public List<AdminUserResponseDTO> getUsers(String status, String search) {
        UserStatus userStatus = (status != null && !status.isBlank()) ? UserStatus.valueOf(status) : null;
        String searchTerm = (search != null && !search.isBlank()) ? search : null;
        return userRepo.findNonAdminUsers(userStatus, searchTerm)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Override
    public AdminUserResponseDTO suspendUser(Long id) {
        User user = findUser(id);
        user.setStatus(UserStatus.INACTIVE);
        return toDTO(userRepo.save(user));
    }

    @Override
    public AdminUserResponseDTO unsuspendUser(Long id) {
        User user = findUser(id);
        user.setStatus(UserStatus.ACTIVE);
        return toDTO(userRepo.save(user));
    }

    private User findUser(Long id) {
        return userRepo.findById(id)
                .orElseThrow(() -> new CommonException("User not found"));
    }

    private AdminUserResponseDTO toDTO(User user) {
        return new AdminUserResponseDTO(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().getRoleName(),
                user.getStatus().name()
        );
    }
}
