package com.project.foodieHub.service.impl;

import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.UserStatus;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.repo.UserRepo;
import com.project.foodieHub.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class UserServiceImpl implements UserService {

    @Autowired
    UserRepo userServiceRepo;

    @Override
    public User getUser(String username) {
        var user = userServiceRepo.findByEmailAndStatus(username, UserStatus.ACTIVE)
            .orElseThrow(() -> new CommonException("User not found"));
        return user;
    }
}
