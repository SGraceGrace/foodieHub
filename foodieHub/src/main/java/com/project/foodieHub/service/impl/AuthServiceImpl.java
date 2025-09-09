package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.JwtResponseDTO;
import com.project.foodieHub.dto.LoginRequestDTO;
import com.project.foodieHub.dto.SignUpRequestDTO;
import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.Role;
import com.project.foodieHub.enums.UserStatus;
import com.project.foodieHub.exception_handler.BadCredentialsException;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.exception_handler.UserAlreadyExistsException;
import com.project.foodieHub.jwtService.JwtService;
import com.project.foodieHub.repo.RoleRepo;
import com.project.foodieHub.repo.UserRepo;
import com.project.foodieHub.service.AuthService;
import com.project.foodieHub.service.RefreshTokenService;
import java.time.Duration;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;
  private final UserRepo userRepo;
  private final RefreshTokenService refreshTokenService;
  private final PasswordEncoder passwordEncoder;
  private final RoleRepo roleRepo;
  private final RedisTemplate<String, String> redisTemplate;

  @Value("${jwt.token.expiration}")
  private int jwtExpiration;

  @Override
  @Transactional
  public JwtResponseDTO login(LoginRequestDTO loginRequestDTO) {
    try {
      authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(loginRequestDTO.getUsername(),
              loginRequestDTO.getPassword()));
    } catch (AuthenticationException e) {
      throw new BadCredentialsException("Invalid username or password");
    }
    var user = userRepo.findByUserNameAndStatus(loginRequestDTO.getUsername(), UserStatus.ACTIVE).orElseThrow(() -> new BadCredentialsException("User not found"));
    var token = jwtService.generateToken(user, loginRequestDTO.getDeviceId());
    var refreshToken = refreshTokenService.createRefreshToken(user, loginRequestDTO.getDeviceId());
    redisTemplate.opsForValue().set(user.getUsername()+loginRequestDTO.getDeviceId(), token, Duration.ofMillis(jwtExpiration)); //store token in redis
    return new JwtResponseDTO(token, refreshToken.getToken());
  }

  @Override
  @Transactional(rollbackFor = Exception.class)
  public JwtResponseDTO signup(SignUpRequestDTO signUpRequestDTO) {

    //validate Username
    var existingUserByUsername = userRepo.findByUserNameAndStatus(signUpRequestDTO.getUsername(), UserStatus.ACTIVE).orElse(null);
    validateUserAlreadyExists(existingUserByUsername, "username");

    var roles = roleRepo.findByRoleName(Role.END_USERS.name()).orElseThrow(() -> new CommonException("Something went wrong"));
    User newUser = new User();
    newUser.setUserName(signUpRequestDTO.getUsername());
    newUser.setName(signUpRequestDTO.getName());
    newUser.setPassword(passwordEncoder.encode(signUpRequestDTO.getPassword()));
    newUser.setRole(roles);
    newUser.setStatus(UserStatus.ACTIVE);
    newUser.setEmail(signUpRequestDTO.getEmail());
    User user = userRepo.saveAndFlush(newUser);
    return doAutoLogin(user.getUsername(), signUpRequestDTO.getDeviceId());
  }

  private JwtResponseDTO doAutoLogin(String username, String deviceId) {
    var user = userRepo.findByUserNameAndStatus(username, UserStatus.ACTIVE).orElseThrow(() -> new BadCredentialsException("User not found"));
    var token = jwtService.generateToken(user, deviceId);
    var refreshToken = refreshTokenService.createRefreshToken(user, deviceId);
    redisTemplate.opsForValue().set(user.getUsername()+deviceId, token, Duration.ofMillis(jwtExpiration)); //store token in redis
    return new JwtResponseDTO(token, refreshToken.getToken());
  }

  private void validateUserAlreadyExists(User user, String fieldName)
      throws UserAlreadyExistsException {
    if (Objects.nonNull(user)) {
      throw new UserAlreadyExistsException(
          "User Already Exists, Please try with other " + fieldName);
    }
  }
}
