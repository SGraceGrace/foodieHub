package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.ActivityLogDTO;
import com.project.foodieHub.dto.AdminUserResponseDTO;
import com.project.foodieHub.dto.CreateAdminRequestDTO;
import com.project.foodieHub.dto.PaginatedResponse;
import com.project.foodieHub.dto.LocationDTO;
import com.project.foodieHub.entity.PartnerProfile;
import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.Role;
import com.project.foodieHub.enums.UserStatus;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.messaging.OwnerStatusEvent;
import com.project.foodieHub.messaging.RabbitMQConfig;
import com.project.foodieHub.repo.ActivityLogRepo;
import com.project.foodieHub.repo.PartnerProfileRepo;
import com.project.foodieHub.repo.RoleRepo;
import com.project.foodieHub.repo.UserRepo;
import com.project.foodieHub.service.ActivityLogService;
import com.project.foodieHub.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepo userRepo;
    private final RoleRepo roleRepo;
    private final PartnerProfileRepo partnerProfileRepo;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;
    private final ActivityLogRepo activityLogRepo;
    private final RabbitTemplate rabbitTemplate;

    @Override
    public PaginatedResponse<AdminUserResponseDTO> getUsers(String status, String search, String role, int page, int size) {
        UserStatus userStatus = (status != null && !status.isBlank()) ? UserStatus.valueOf(status) : null;
        String searchTerm = (search != null && !search.isBlank()) ? search : null;
        String roleName = (role != null && !role.isBlank()) ? role : null;

        Page<User> result = userRepo.findAllUsers(
                roleName, userStatus, searchTerm,
                PageRequest.of(page, size, Sort.by("id").descending()));

        List<AdminUserResponseDTO> content = result.getContent().stream().map(this::toDTO).toList();
        return new PaginatedResponse<>(content, result.getNumber(), result.getTotalPages(),
                result.getTotalElements(), result.getSize());
    }

    @Override
    public AdminUserResponseDTO suspendUser(Long id) {
        User user = findUser(id);
        user.setStatus(UserStatus.INACTIVE);
        User saved = userRepo.save(user);
        activityLogService.log("SUSPEND_USER", "User", id, "email: " + user.getEmail());
        return toDTO(saved);
    }

    @Override
    public AdminUserResponseDTO unsuspendUser(Long id) {
        User user = findUser(id);
        user.setStatus(UserStatus.ACTIVE);
        User saved = userRepo.save(user);
        activityLogService.log("UNSUSPEND_USER", "User", id, "email: " + user.getEmail());
        return toDTO(saved);
    }

    @Override
    @Transactional
    public AdminUserResponseDTO createAdmin(CreateAdminRequestDTO request) {
        userRepo.findByUserName(request.getEmail()).ifPresent(u -> {
            throw new CommonException("An account with this email already exists.");
        });

        var adminRole = roleRepo.findByRoleName(Role.ADMIN.name())
                .orElseThrow(() -> new CommonException("Admin role not found."));

        User newAdmin = new User();
        newAdmin.setFirstName(request.getFirstName());
        newAdmin.setLastName(request.getLastName());
        newAdmin.setEmail(request.getEmail());
        newAdmin.setUserName(request.getEmail());
        newAdmin.setPassword(passwordEncoder.encode(request.getPassword()));
        newAdmin.setRole(adminRole);
        newAdmin.setStatus(UserStatus.ACTIVE);

        User saved = userRepo.save(newAdmin);
        activityLogService.log("CREATE_ADMIN", "User", saved.getId(), "email: " + saved.getEmail());
        return toDTO(saved);
    }

    @Override
    public List<ActivityLogDTO> getActivityLogs() {
        return activityLogService.getLogs();
    }

    @Override
    public PaginatedResponse<AdminUserResponseDTO> getRestaurantOwners(String status, int page, int size) {
        UserStatus userStatus = (status != null && !status.isBlank()) ? UserStatus.valueOf(status) : null;
        Page<User> result = userRepo.findRestaurantOwners(
                userStatus, PageRequest.of(page, size, Sort.by("id").descending()));
        List<AdminUserResponseDTO> content = result.getContent().stream().map(this::toDTO).toList();
        return new PaginatedResponse<>(content, result.getNumber(), result.getTotalPages(),
                result.getTotalElements(), result.getSize());
    }

    @Override
    public AdminUserResponseDTO approveOwner(Long id) {
        User user = findUser(id);
        user.setStatus(UserStatus.ACTIVE);
        User saved = userRepo.save(user);
        activityLogService.log("APPROVE_OWNER", "User", id, "email: " + user.getEmail());
        publishOwnerStatus(saved, "APPROVED");
        return toDTO(saved);
    }

    @Override
    public AdminUserResponseDTO rejectOwner(Long id) {
        User user = findUser(id);
        user.setStatus(UserStatus.INACTIVE);
        User saved = userRepo.save(user);
        activityLogService.log("REJECT_OWNER", "User", id, "email: " + user.getEmail());
        publishOwnerStatus(saved, "REJECTED");
        return toDTO(saved);
    }

    @Override
    public PaginatedResponse<AdminUserResponseDTO> getDrivers(String status, int page, int size) {
        UserStatus userStatus = (status != null && !status.isBlank()) ? UserStatus.valueOf(status) : null;
        Page<User> result = userRepo.findDrivers(
                userStatus, PageRequest.of(page, size, Sort.by("id").descending()));
        List<AdminUserResponseDTO> content = result.getContent().stream().map(this::toDTO).toList();
        return new PaginatedResponse<>(content, result.getNumber(), result.getTotalPages(),
                result.getTotalElements(), result.getSize());
    }

    @Override
    public AdminUserResponseDTO approveDriver(Long id) {
        User user = findUser(id);
        user.setStatus(UserStatus.ACTIVE);
        User saved = userRepo.save(user);
        activityLogService.log("APPROVE_DRIVER", "User", id, "email: " + user.getEmail());
        return toDTO(saved);
    }

    @Override
    public AdminUserResponseDTO rejectDriver(Long id) {
        User user = findUser(id);
        user.setStatus(UserStatus.INACTIVE);
        User saved = userRepo.save(user);
        activityLogService.log("REJECT_DRIVER", "User", id, "email: " + user.getEmail());
        return toDTO(saved);
    }

    private void publishOwnerStatus(User user, String status) {
        String restaurantName = partnerProfileRepo.findById(user.getId())
                .map(PartnerProfile::getRestaurantName).orElse(null);
        var event = new OwnerStatusEvent(
                String.valueOf(user.getId()),
                user.getEmail(),
                user.getFirstName() + " " + user.getLastName(),
                restaurantName,
                status
        );
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.OWNER_STATUS_RKEY, event);
    }

    private User findUser(Long id) {
        return userRepo.findById(id)
                .orElseThrow(() -> new CommonException("User not found"));
    }

    private AdminUserResponseDTO toDTO(User user) {
        PartnerProfile profile = partnerProfileRepo.findById(user.getId()).orElse(null);
        LocationDTO locationDTO = null;
        if (profile != null && profile.getRestaurantLocation() != null) {
            var loc = profile.getRestaurantLocation();
            locationDTO = new LocationDTO(loc.getCity(), loc.getState(), loc.getCountry(), loc.getLat(), loc.getLng());
        }
        return new AdminUserResponseDTO(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().getRoleName(),
                user.getStatus().name(),
                profile != null ? profile.getRestaurantName() : null,
                locationDTO,
                profile != null ? profile.getFssaiNumber() : null,
                profile != null ? profile.getGstNumber() : null,
                user.getVehicleType(),
                user.getLicenseNumber()
        );
    }
}
