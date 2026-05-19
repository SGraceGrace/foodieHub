package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.CreateRestaurantStaffRequestDTO;
import com.project.foodieHub.dto.PartnerRegisterRequestDTO;
import com.project.foodieHub.dto.RestaurantStaffResponseDTO;
import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.AuthProvider;
import com.project.foodieHub.enums.Role;
import com.project.foodieHub.enums.UserStatus;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.exception_handler.UserAlreadyExistsException;
import com.project.foodieHub.repo.RoleRepo;
import com.project.foodieHub.repo.UserRepo;
import com.project.foodieHub.service.PartnerService;
import com.project.foodieHub.messaging.PartnerRegisteredEvent;
import com.project.foodieHub.messaging.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerServiceImpl implements PartnerService {

    private final UserRepo userRepo;
    private final RoleRepo roleRepo;
    private final PasswordEncoder passwordEncoder;
    private final RestTemplate restTemplate;
    private final RabbitTemplate rabbitTemplate;

    @Value("${food.service.url}")
    private String foodServiceUrl;

    @Override
    @Transactional
    public void register(PartnerRegisterRequestDTO dto) {
        userRepo.findByUserName(dto.getEmail()).ifPresent(u -> {
            throw new UserAlreadyExistsException("An account with this email already exists.");
        });

        var ownerRole = roleRepo.findByRoleName(Role.RESTAURANT_OWNER.name())
                .orElseThrow(() -> new CommonException("Role not found."));

        User owner = new User();
        owner.setFirstName(dto.getFirstName());
        owner.setLastName(dto.getLastName());
        owner.setEmail(dto.getEmail());
        owner.setUserName(dto.getEmail());
        owner.setPassword(passwordEncoder.encode(dto.getPassword()));
        owner.setPhone(dto.getPhone());
        owner.setBio(dto.getRestaurantName());
        owner.setRestaurantAddress(dto.getRestaurantAddress());
        owner.setFssaiNumber(dto.getFssaiNumber());
        owner.setGstNumber(dto.getGstNumber());
        owner.setRole(ownerRole);
        owner.setStatus(UserStatus.PENDING);
        owner.setAuthProvider(AuthProvider.LOCAL);

        var tempAuth = new UsernamePasswordAuthenticationToken(dto.getEmail(), null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(tempAuth);
        User saved;
        try {
            saved = userRepo.save(owner);
        } finally {
            SecurityContextHolder.clearContext();
        }

        createRestaurantInFoodService(dto, saved.getId());
        publishPartnerRegisteredEvent(dto, saved);
    }

    private void publishPartnerRegisteredEvent(PartnerRegisterRequestDTO dto, User saved) {
        var event = new PartnerRegisteredEvent(
                saved.getFirstName() + " " + saved.getLastName(),
                saved.getEmail(),
                saved.getPhone(),
                dto.getRestaurantName(),
                dto.getRestaurantAddress(),
                dto.getFssaiNumber(),
                dto.getGstNumber()
        );
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.PARTNER_RKEY, event);
        log.info("Published partner.registered event for: {}", saved.getEmail());
    }

    @Override
    @Transactional
    public RestaurantStaffResponseDTO createStaff(CreateRestaurantStaffRequestDTO dto) {
        userRepo.findByUserName(dto.getEmail()).ifPresent(u -> {
            throw new UserAlreadyExistsException("An account with this email already exists.");
        });

        var staffRole = roleRepo.findByRoleName(Role.RESTAURANT_STAFF.name())
                .orElseThrow(() -> new CommonException("Role not found."));

        User staff = new User();
        staff.setFirstName(dto.getFirstName());
        staff.setLastName(dto.getLastName());
        staff.setEmail(dto.getEmail());
        staff.setUserName(dto.getEmail());
        staff.setPassword(passwordEncoder.encode(dto.getPassword()));
        staff.setRole(staffRole);
        staff.setStatus(UserStatus.ACTIVE);
        staff.setAuthProvider(AuthProvider.LOCAL);
        if (dto.getRestaurantIds() != null) {
            staff.setAssignedRestaurantIds(new java.util.HashSet<>(dto.getRestaurantIds()));
        }

        User saved = userRepo.save(staff);
        return toStaffDTO(saved);
    }

    @Override
    public List<RestaurantStaffResponseDTO> getStaff(String restaurantId) {
        return userRepo.findStaffByRestaurantId(restaurantId)
                .stream().map(this::toStaffDTO).toList();
    }

    @Override
    @Transactional
    public void archiveStaff(Long staffId) {
        User staff = findStaffUser(staffId);
        staff.setStatus(UserStatus.INACTIVE);
        userRepo.save(staff);
    }

    @Override
    @Transactional
    public void activateStaff(Long staffId) {
        User staff = findStaffUser(staffId);
        staff.setStatus(UserStatus.ACTIVE);
        userRepo.save(staff);
    }

    private User findStaffUser(Long staffId) {
        User staff = userRepo.findById(staffId)
                .orElseThrow(() -> new CommonException("Staff user not found."));
        if (!Role.RESTAURANT_STAFF.name().equals(staff.getRole().getRoleName())) {
            throw new CommonException("User is not a restaurant staff member.");
        }
        return staff;
    }

    private RestaurantStaffResponseDTO toStaffDTO(User u) {
        return new RestaurantStaffResponseDTO(
                u.getId(), u.getFirstName(), u.getLastName(),
                u.getEmail(), u.getPhone(), u.getStatus().name(),
                new java.util.ArrayList<>(u.getAssignedRestaurantIds())
        );
    }

    private void createRestaurantInFoodService(PartnerRegisterRequestDTO dto, Long ownerId) {
        try {
            restTemplate.postForObject(
                    foodServiceUrl + "/api/v1/restaurants",
                    Map.of(
                            "name", dto.getRestaurantName(),
                            "ownerId", String.valueOf(ownerId),
                            "address", dto.getRestaurantAddress() != null ? dto.getRestaurantAddress() : "",
                            "fssaiNumber", dto.getFssaiNumber() != null ? dto.getFssaiNumber() : "",
                            "gstNumber", dto.getGstNumber() != null ? dto.getGstNumber() : ""
                    ),
                    Object.class
            );
        } catch (Exception e) {
            log.warn("Could not create restaurant in food-service for owner {}: {}", ownerId, e.getMessage());
        }
    }
}
