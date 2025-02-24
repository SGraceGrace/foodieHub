package com.project.foodieHub.service;

import com.project.foodieHub.dto.JwtResponseDTO;
import com.project.foodieHub.dto.TokenRefreshRequest;
import com.project.foodieHub.entity.RefreshToken;
import com.project.foodieHub.entity.User;

public interface RefreshTokenService {
  public JwtResponseDTO refreshToken(TokenRefreshRequest tokenRefreshRequest);

  public RefreshToken createRefreshToken(User user);
}
