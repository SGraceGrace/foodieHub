package com.project.foodieHub.config;

import com.project.foodieHub.enums.UserStatus;
import com.project.foodieHub.jwtService.JwtService;
import com.project.foodieHub.repo.UserRepo;
import com.project.foodieHub.service.impl.LogoutService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.transaction.annotation.Transactional;

public class CustomLogoutHandler implements LogoutHandler {

  @Autowired
  private RedisTemplate<String, String> redisTemplate;

  @Autowired
  private JwtService jwtService;

  @Autowired
  private LogoutService logoutService;

  @Autowired
  private UserRepo userRepo;

  @Override
  @Transactional
  public void logout(HttpServletRequest request, HttpServletResponse response,
      Authentication authentication) {
    String token = request.getHeader("Authorization");

    if(Objects.isNull(token) || !token.startsWith("Bearer ")) {
      response.setStatus(HttpServletResponse.SC_OK);
      try {
        response.getWriter().write("User is already logged out or token is missing.");
      } catch (IOException e) {
        throw new RuntimeException(e);
      }
      return;
    }
    token = token.substring(7);
    String username = null;
    String deviceId = null;
    try {
      username = jwtService.extractUserName(token);
      deviceId = jwtService.extractDeviceId(token);
    } catch (ExpiredJwtException e) {
      Claims claims = e.getClaims();
      username = claims.getSubject();
      deviceId = (String) claims.get("deviceId");
    } catch (JwtException e) {
      response.setStatus(HttpServletResponse.SC_OK);
      return;
    }

    final String finalUsername = username;
    final String finalDeviceId = deviceId;
    redisTemplate.delete(finalUsername + finalDeviceId);
    userRepo.findByUserNameAndStatus(finalUsername, UserStatus.ACTIVE)
        .ifPresent(user -> logoutService.cleanUpUserTokens(user, finalDeviceId));
  }
}
