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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class PartnerServiceImpl implements PartnerService {

    private final UserRepo userRepo;
    private final RoleRepo roleRepo;
    private final PasswordEncoder passwordEncoder;

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
        owner.setBio(dto.getRestaurantName()); // restaurant name stored in bio for POC
        owner.setRole(ownerRole);
        owner.setStatus(UserStatus.PENDING);
        owner.setAuthProvider(AuthProvider.LOCAL);

        var tempAuth = new UsernamePasswordAuthenticationToken(dto.getEmail(), null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(tempAuth);
        try {
            userRepo.save(owner);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
