package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.DriverRegisterRequestDTO;
import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.AuthProvider;
import com.project.foodieHub.enums.Role;
import com.project.foodieHub.enums.UserStatus;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.exception_handler.UserAlreadyExistsException;
import com.project.foodieHub.messaging.DriverRegisteredEvent;
import com.project.foodieHub.messaging.RabbitMQConfig;
import com.project.foodieHub.repo.RoleRepo;
import com.project.foodieHub.repo.UserRepo;
import com.project.foodieHub.service.DriverService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverServiceImpl implements DriverService {

    private final UserRepo userRepo;
    private final RoleRepo roleRepo;
    private final PasswordEncoder passwordEncoder;
    private final RabbitTemplate rabbitTemplate;

    @Override
    @Transactional
    public void register(DriverRegisterRequestDTO dto) {
        userRepo.findByUserName(dto.getEmail()).ifPresent(u -> {
            throw new UserAlreadyExistsException("An account with this email already exists.");
        });

        var driverRole = roleRepo.findByRoleName(Role.DRIVER.name())
                .orElseThrow(() -> new CommonException("Role not found."));

        User driver = new User();
        driver.setFirstName(dto.getFirstName());
        driver.setLastName(dto.getLastName());
        driver.setEmail(dto.getEmail());
        driver.setUserName(dto.getEmail());
        driver.setPassword(passwordEncoder.encode(dto.getPassword()));
        driver.setPhone(dto.getPhone());
        driver.setVehicleType(dto.getVehicleType());
        driver.setLicenseNumber(dto.getLicenseNumber());
        driver.setBankAccount(dto.getBankAccount());
        driver.setRole(driverRole);
        driver.setStatus(UserStatus.PENDING);
        driver.setAuthProvider(AuthProvider.LOCAL);

        var tempAuth = new UsernamePasswordAuthenticationToken(dto.getEmail(), null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(tempAuth);
        try {
            userRepo.save(driver);
        } finally {
            SecurityContextHolder.clearContext();
        }

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.DRIVER_RKEY,
                new DriverRegisteredEvent(
                        dto.getFirstName() + " " + dto.getLastName(),
                        dto.getEmail(),
                        dto.getPhone(),
                        dto.getVehicleType(),
                        dto.getLicenseNumber()
                )
        );
        log.info("Published driver.registered event for: {}", dto.getEmail());
    }
}
