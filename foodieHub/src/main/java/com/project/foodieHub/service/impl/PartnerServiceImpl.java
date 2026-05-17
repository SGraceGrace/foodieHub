package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.PartnerRegisterRequestDTO;
import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.AuthProvider;
import com.project.foodieHub.enums.Role;
import com.project.foodieHub.enums.UserStatus;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.exception_handler.UserAlreadyExistsException;
import com.project.foodieHub.repo.RoleRepo;
import com.project.foodieHub.repo.UserRepo;
import com.project.foodieHub.service.PartnerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerServiceImpl implements PartnerService {

    private final UserRepo userRepo;
    private final RoleRepo roleRepo;
    private final PasswordEncoder passwordEncoder;
    private final RestTemplate restTemplate;

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

        createRestaurantInFoodService(dto.getRestaurantName(), saved.getId());
    }

    private void createRestaurantInFoodService(String restaurantName, Long ownerId) {
        try {
            restTemplate.postForObject(
                    foodServiceUrl + "/api/v1/restaurants",
                    Map.of("name", restaurantName, "ownerId", String.valueOf(ownerId)),
                    Object.class
            );
        } catch (Exception e) {
            log.warn("Could not create restaurant in food-service for owner {}: {}", ownerId, e.getMessage());
        }
    }
}
