package com.project.foodieHub.service.impl;

import com.project.foodieHub.entity.User;
import com.project.foodieHub.repo.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    UserRepo userServiceRepo;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user =  userServiceRepo.findByUserName(username).orElse(null);

        if(Objects.isNull(user)) {
            throw new UsernameNotFoundException("User is not found");
        }

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .roles(String.valueOf(user.getRoles())).build();
    }
}
