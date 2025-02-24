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
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
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

  @Override
  public JwtResponseDTO login(LoginRequestDTO loginRequestDTO) {
    Authentication authentication;
    try {
      authentication = authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(loginRequestDTO.getUsername(),
              loginRequestDTO.getPassword()));
    } catch (AuthenticationException e) {
      throw new BadCredentialsException("Invalid username or password");
    }
    var user = userRepo.findByUserName(loginRequestDTO.getUsername()).orElseThrow(() -> new BadCredentialsException("User not found"));
    SecurityContextHolder.getContext().setAuthentication(authentication);
    var userDetails = (UserDetails) authentication.getPrincipal();
    var token = jwtService.generateToken(user);
    var refreshToken = refreshTokenService.createRefreshToken(user);
    return new JwtResponseDTO(token, refreshToken.getToken(), userDetails);
  }

  @Override
  @Transactional(rollbackFor = Exception.class)
  public JwtResponseDTO signup(SignUpRequestDTO signUpRequestDTO) {

    //validate Username
    var existingUserByUsername = userRepo.findByUserName(signUpRequestDTO.getUsername());
    validateUserAlreadyExists(existingUserByUsername, "username");

    //validate Email
    var existingUserByEmail = userRepo.findByEmail(signUpRequestDTO.getEmail());
    validateUserAlreadyExists(existingUserByEmail, "email");

    var roles = roleRepo.findByRoleName(Role.END_USERS.name()).orElseThrow(() -> new CommonException("Something went wrong"));
    User newUser = new User();
    newUser.setUserName(signUpRequestDTO.getUsername());
    newUser.setName(signUpRequestDTO.getName());
    newUser.setPassword(passwordEncoder.encode(signUpRequestDTO.getPassword()));
    newUser.setRole(roles);
    newUser.setStatus(UserStatus.ACTIVE);
    User user = userRepo.saveAndFlush(newUser);
    return doAutoLogin(user.getUsername());
  }

  private JwtResponseDTO doAutoLogin(String username) {
    var user = userRepo.findByUserName(username).orElseThrow(() -> new BadCredentialsException("User not found"));
    var userDetails = new org.springframework.security.core.userdetails.User(
        user.getUsername(), user.getPassword(), user.getAuthorities()
    );
    Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, user.getAuthorities());
    SecurityContextHolder.getContext().setAuthentication(authentication);

    var token = jwtService.generateToken(user);
    var refreshToken = refreshTokenService.createRefreshToken(user);
    return new JwtResponseDTO(token, refreshToken.getToken(), userDetails);
  }

  private void validateUserAlreadyExists(Optional<User> user, String fieldName)
      throws UserAlreadyExistsException {
    if (user.isPresent()) {
      throw new UserAlreadyExistsException(
          "User Already Exists, Please try with other " + fieldName);
    }
  }
}
