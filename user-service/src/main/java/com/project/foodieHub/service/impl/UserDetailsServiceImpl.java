package com.project.foodieHub.service.impl;

import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.UserStatus;
import com.project.foodieHub.repo.UserRepo;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    UserRepo userServiceRepo;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userServiceRepo.findByUserNameAndStatus(username, UserStatus.ACTIVE)
                .orElseThrow(() -> new UsernameNotFoundException("User is not found"));
    }
}
