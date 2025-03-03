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
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

  @Value("${refresh.token.expiration}")
  private Long refreshTokenExpiration;

  private final RefreshTokenRepo refreshTokenRepo;
  private final UserRepo userRepo;
  private final JwtService jwtService;

  public JwtResponseDTO refreshToken(TokenRefreshRequest tokenRefreshRequest) {
    var refreshToken = refreshTokenRepo.findByToken(tokenRefreshRequest.getRefreshToken()).orElseThrow(() -> new CommonException("Refresh Token is invalid"));

    if (isRefreshTokenExpired(refreshToken)) {
      refreshTokenRepo.delete(refreshToken);
      throw new RefreshTokenException("Refresh token expired, please login again");
    }

    var user = userRepo.findById(refreshToken.getUser().getId()).orElseThrow(() -> new CommonException("User cannot be fetched"));

    var userDetails = new org.springframework.security.core.userdetails.User(
        user.getUsername(), user.getPassword(), user.getAuthorities()
    );
    Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, user.getAuthorities());
    SecurityContextHolder.getContext().setAuthentication(authentication);
    var token = jwtService.generateToken(user);
    return new JwtResponseDTO(token, refreshToken.getToken(), user);
  }

  private boolean isRefreshTokenExpired(RefreshToken refreshToken){
    return refreshToken.getExpiryDate().isBefore(LocalDate.now());
  }

  @Override
  public RefreshToken createRefreshToken(User user) {
    RefreshToken refreshToken = refreshTokenRepo.findByUser(user)
        .orElse(new RefreshToken());
    refreshToken.setToken(UUID.randomUUID().toString());
    refreshToken.setUser(user);
    refreshToken.setExpiryDate(
        LocalDate.now().plusDays(TimeUnit.MILLISECONDS.toDays(refreshTokenExpiration)));
    return refreshTokenRepo.saveAndFlush(refreshToken);
  }
}