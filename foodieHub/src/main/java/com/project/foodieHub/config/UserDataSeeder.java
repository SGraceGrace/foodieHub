package com.project.foodieHub.config;

import com.project.foodieHub.entity.Roles;
import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.AuthProvider;
import com.project.foodieHub.enums.Role;
import com.project.foodieHub.enums.UserStatus;

import com.project.foodieHub.repo.RoleRepo;
import com.project.foodieHub.repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(1)
@RequiredArgsConstructor
public class UserDataSeeder implements CommandLineRunner {

    private final RoleRepo roleRepo;
    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedRoles();
        seedAdminUser();
    }

    private void seedRoles() {
        for (Role role : Role.values()) {
            if (roleRepo.findByRoleName(role.name()).isEmpty()) {
                Roles newRole = new Roles();
                newRole.setRoleName(role.name());
                roleRepo.save(newRole);
            }
        }
    }

    private void seedAdminUser() {
        if (userRepo.findByUserName("admin@foodiehub.com").isPresent()) {
            return;
        }

        Roles adminRole = roleRepo.findByRoleName(Role.SUPER_ADMIN.name())
                .orElseThrow(() -> new IllegalStateException("SUPER_ADMIN role not found after seeding"));

        User admin = new User();
        admin.setFirstName("Admin");
        admin.setLastName("FoodieHub");
        admin.setUserName("admin@foodiehub.com");
        admin.setEmail("admin@foodiehub.com");
        admin.setPassword(passwordEncoder.encode("Admin@123"));
        admin.setRole(adminRole);
        admin.setStatus(UserStatus.ACTIVE);
        admin.setAuthProvider(AuthProvider.LOCAL);

        userRepo.save(admin);
    }
}
