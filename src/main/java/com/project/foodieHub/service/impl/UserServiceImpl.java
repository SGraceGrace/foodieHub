package com.project.foodieHub.service.impl;

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
}
