package com.project.foodieHub.config;

import com.project.foodieHub.entity.User;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class AuditorAwareImpl implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.of("SYSTEM");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return Optional.of(String.valueOf(user.getId()));
        }
        if (principal instanceof String name && !name.isBlank()) {
            return Optional.of(name);
        }
        return Optional.of("SYSTEM");
    }
}
