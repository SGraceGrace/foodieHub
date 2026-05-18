package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.ActivityLogDTO;
import com.project.foodieHub.dto.AdminUserResponseDTO;
import com.project.foodieHub.dto.CreateAdminRequestDTO;
import com.project.foodieHub.dto.NotificationDTO;
import com.project.foodieHub.dto.PaginatedResponse;
import com.project.foodieHub.entity.ActivityLog;
import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.Role;
import com.project.foodieHub.enums.UserStatus;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.messaging.OwnerStatusEvent;
import com.project.foodieHub.messaging.RabbitMQConfig;
import com.project.foodieHub.repo.ActivityLogRepo;
import com.project.foodieHub.repo.RoleRepo;
import com.project.foodieHub.repo.UserRepo;
import com.project.foodieHub.service.ActivityLogService;
import com.project.foodieHub.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepo userRepo;
    private final RoleRepo roleRepo;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;
    private final ActivityLogRepo activityLogRepo;
    private final RabbitTemplate rabbitTemplate;

    private static final Map<String, String> ACTION_LABELS = Map.of(
        "APPROVE_OWNER",  "approved restaurant owner",
        "REJECT_OWNER",   "rejected restaurant owner",
        "SUSPEND_USER",   "suspended user",
        "UNSUSPEND_USER", "unsuspended user",
        "CREATE_ADMIN",   "created admin user"
    );

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
    public List<NotificationDTO> getNotifications() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        Date startDate = Date.from(startOfDay.atZone(ZoneId.systemDefault()).toInstant());
        Date endDate = Date.from(endOfDay.atZone(ZoneId.systemDefault()).toInstant());

        List<NotificationDTO> notifications = new ArrayList<>();

        // Today's pending owner registrations (visible to all admins)
        userRepo.findTodayPendingOwners(startDate, endDate).forEach(u -> notifications.add(
            new NotificationDTO(
                "PENDING_OWNER",
                "New restaurant registration: " + u.getBio() + " by " + u.getFirstName() + " " + u.getLastName(),
                null,
                u.getCreatedDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime()
            )
        ));

        // Activity logs: SUPER_ADMIN sees all, ADMIN sees only their own
        User currentUser = resolveCurrentUser();
        boolean isSuperAdmin = currentUser != null &&
            currentUser.getRole().getRoleName().equals(Role.SUPER_ADMIN.name());

        List<ActivityLog> logs = isSuperAdmin
            ? activityLogRepo.findTodayLogs(startOfDay, endOfDay)
            : activityLogRepo.findTodayLogsByActor(
                currentUser != null ? currentUser.getEmail() : "", startOfDay, endOfDay);

        logs.forEach(l -> notifications.add(
            new NotificationDTO(
                "ACTIVITY",
                ACTION_LABELS.getOrDefault(l.getAction(), l.getAction().toLowerCase().replace('_', ' '))
                    + " on " + l.getTargetEntity() + " #" + l.getTargetId()
                    + (l.getDetails() != null ? " (" + l.getDetails() + ")" : ""),
                l.getActorEmail(),
                l.getCreatedAt()
            )
        ));

        notifications.sort(Comparator.comparing(NotificationDTO::getTimestamp).reversed());
        return notifications;
    }

    private User resolveCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }

    private void publishOwnerStatus(User user, String status) {
        var event = new OwnerStatusEvent(
                String.valueOf(user.getId()),
                user.getEmail(),
                user.getFirstName() + " " + user.getLastName(),
                user.getBio(),
                status
        );
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.OWNER_STATUS_RKEY, event);
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
                user.getStatus().name(),
                user.getBio(),
                user.getRestaurantAddress(),
                user.getFssaiNumber(),
                user.getGstNumber()
        );
    }
}
