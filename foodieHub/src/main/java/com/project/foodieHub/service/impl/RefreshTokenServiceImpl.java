package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.JwtResponseDTO;
import com.project.foodieHub.dto.TokenRefreshRequest;
import com.project.foodieHub.entity.RefreshToken;
import com.project.foodieHub.entity.User;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.exception_handler.RefreshTokenException;
import com.project.foodieHub.jwtService.JwtService;
import com.project.foodieHub.repo.RefreshTokenRepo;
import com.project.foodieHub.repo.UserRepo;
import com.project.foodieHub.service.RefreshTokenService;
import java.time.Duration;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

  @Value("${refresh.token.expiration}")
  private Long refreshTokenExpiration;

  private final RefreshTokenRepo refreshTokenRepo;
  private final UserRepo userRepo;
  private final JwtService jwtService;
  private final RedisTemplate<String, String> redisTemplate;

  @Value("${jwt.token.expiration}")
  private int jwtExpiration;

  public JwtResponseDTO refreshToken(TokenRefreshRequest tokenRefreshRequest) {
    var refreshToken = refreshTokenRepo.findByToken(tokenRefreshRequest.getRefreshToken()).orElseThrow(() -> new CommonException("Refresh Token is invalid"));

    if (isRefreshTokenExpired(refreshToken)) {
      refreshTokenRepo.delete(refreshToken);
      throw new RefreshTokenException("Refresh token expired, please login again");
    }

    var user = userRepo.findById(refreshToken.getUser().getId()).orElseThrow(() -> new CommonException("User cannot be fetched"));
    var token = jwtService.generateToken(user, tokenRefreshRequest.getDeviceId());
    redisTemplate.opsForValue().set(user.getUsername()+tokenRefreshRequest.getDeviceId(), token, Duration.ofMillis(jwtExpiration)); //store token in redis
    return new JwtResponseDTO(token, refreshToken.getToken());
  }

  private boolean isRefreshTokenExpired(RefreshToken refreshToken){
    return refreshToken.getExpiryDate().isBefore(LocalDate.now());
  }

  @Override
  public RefreshToken createRefreshToken(User user, String deviceId) {
    RefreshToken refreshToken = refreshTokenRepo.findByUserAndDeviceId(user, deviceId)
        .orElse(new RefreshToken());
    refreshToken.setToken(UUID.randomUUID().toString());
    refreshToken.setUser(user);
    refreshToken.setDeviceId(deviceId);
    refreshToken.setExpiryDate(
        LocalDate.now().plusDays(TimeUnit.MILLISECONDS.toDays(refreshTokenExpiration)));
    return refreshTokenRepo.saveAndFlush(refreshToken);
  }
}