package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.DriverProfileDTO;
import com.project.foodieHub.dto.DriverProfileUpdateDTO;
import com.project.foodieHub.dto.DriverRegisterRequestDTO;
import com.project.foodieHub.entity.DriverProfile;
import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.AuthProvider;
import com.project.foodieHub.enums.Role;
import com.project.foodieHub.enums.UserStatus;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.exception_handler.UserAlreadyExistsException;
import com.project.foodieHub.messaging.DriverRegisteredEvent;
import com.project.foodieHub.messaging.RabbitMQConfig;
import com.project.foodieHub.repo.DriverProfileRepo;
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

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverServiceImpl implements DriverService {

    private final UserRepo userRepo;
    private final RoleRepo roleRepo;
    private final DriverProfileRepo driverProfileRepo;
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
        driver.setRole(driverRole);
        driver.setStatus(UserStatus.PENDING);
        driver.setAuthProvider(AuthProvider.LOCAL);

        var tempAuth = new UsernamePasswordAuthenticationToken(dto.getEmail(), null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(tempAuth);
        User saved;
        try {
            saved = userRepo.save(driver);
        } finally {
            SecurityContextHolder.clearContext();
        }

        driverProfileRepo.save(new DriverProfile(
                saved,
                dto.getVehicleType(),
                dto.getLicenseNumber(),
                dto.getBankAccount()
        ));

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

    @Override
    @Transactional
    public void setAvailability(String email, boolean online) {
        User driver = userRepo.findByUserName(email)
                .orElseThrow(() -> new CommonException("Driver not found."));
        DriverProfile profile = driverProfileRepo.findById(driver.getId())
                .orElseThrow(() -> new CommonException("Driver profile not found."));
        profile.setOnline(online);
        driverProfileRepo.save(profile);
        log.info("Driver {} is now {}", email, online ? "ONLINE" : "OFFLINE");
    }

    @Override
    public DriverProfileDTO getProfile(String email) {
        User driver = userRepo.findByUserName(email)
                .orElseThrow(() -> new CommonException("Driver not found."));
        DriverProfile profile = driverProfileRepo.findById(driver.getId())
                .orElseThrow(() -> new CommonException("Driver profile not found."));
        return new DriverProfileDTO(
                driver.getFirstName(),
                driver.getLastName(),
                driver.getPhone(),
                driver.getEmail(),
                profile.getVehicleType(),
                profile.getLicenseNumber(),
                profile.getBankAccount(),
                driver.getStatus().name(),
                profile.isOnline()
        );
    }

    @Override
    @Transactional
    public DriverProfileDTO updateProfile(String email, DriverProfileUpdateDTO dto) {
        User driver = userRepo.findByUserName(email)
                .orElseThrow(() -> new CommonException("Driver not found."));
        DriverProfile profile = driverProfileRepo.findById(driver.getId())
                .orElseThrow(() -> new CommonException("Driver profile not found."));

        if (dto.getFirstName() != null && !dto.getFirstName().isBlank())
            driver.setFirstName(dto.getFirstName().trim());
        if (dto.getLastName() != null && !dto.getLastName().isBlank())
            driver.setLastName(dto.getLastName().trim());
        if (dto.getPhone() != null && !dto.getPhone().isBlank())
            driver.setPhone(dto.getPhone().trim());
        if (dto.getVehicleType() != null && !dto.getVehicleType().isBlank())
            profile.setVehicleType(dto.getVehicleType().trim());
        if (dto.getLicenseNumber() != null && !dto.getLicenseNumber().isBlank())
            profile.setLicenseNumber(dto.getLicenseNumber().trim());
        if (dto.getBankAccount() != null && !dto.getBankAccount().isBlank())
            profile.setBankAccount(dto.getBankAccount().trim());

        userRepo.save(driver);
        driverProfileRepo.save(profile);

        return new DriverProfileDTO(
                driver.getFirstName(),
                driver.getLastName(),
                driver.getPhone(),
                driver.getEmail(),
                profile.getVehicleType(),
                profile.getLicenseNumber(),
                profile.getBankAccount(),
                driver.getStatus().name(),
                profile.isOnline()
        );
    }

    @Override
    public List<String> getOnlineDriverEmails() {
        return driverProfileRepo.findEmailsOfOnlineDriversWithLocation();
    }

    @Override
    @Transactional
    public void updateLocation(String email, double lat, double lng) {
        User driver = userRepo.findByUserName(email)
                .orElseThrow(() -> new CommonException("Driver not found."));
        DriverProfile profile = driverProfileRepo.findById(driver.getId())
                .orElseThrow(() -> new CommonException("Driver profile not found."));
        profile.setLatitude(lat);
        profile.setLongitude(lng);
        profile.setLastLocationAt(LocalDateTime.now());
        driverProfileRepo.save(profile);
    }
}
