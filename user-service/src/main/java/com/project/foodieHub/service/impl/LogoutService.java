package com.project.foodieHub.service.impl;

import com.project.foodieHub.entity.User;
import com.project.foodieHub.repo.RefreshTokenRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LogoutService {

  @Autowired
  private RefreshTokenRepo refreshTokenRepo;

  @Transactional
  public void cleanUpUserTokens(User user, String deviceId) {
    refreshTokenRepo.deleteAllByUserAndDeviceId(user, deviceId);
  }
}
