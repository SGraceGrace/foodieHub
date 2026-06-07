package com.project.foodieHub.service;

import com.project.foodieHub.dto.UpdateProfileRequestDTO;
import com.project.foodieHub.entity.User;

public interface UserService {

  User getUser(String username);

  void updateProfile(String username, UpdateProfileRequestDTO dto);
}
