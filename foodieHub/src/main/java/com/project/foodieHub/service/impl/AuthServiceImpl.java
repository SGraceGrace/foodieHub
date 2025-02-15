package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.LoginRequestDTO;
import com.project.foodieHub.dto.SignUpRequestDTO;
import com.project.foodieHub.jwtService.JwtService;
import com.project.foodieHub.repo.UserRepo;
import com.project.foodieHub.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;
  private final UserRepo userRepo;

  @Override
  public String login(LoginRequestDTO loginRequestDTO) throws Exception {
    try {
      authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(loginRequestDTO.getUsername(),
              loginRequestDTO.getPassword()));
      var user = userRepo.findByUserName(loginRequestDTO.getUsername()).orElse(null);
      var token = jwtService.generateToken(user);
      return token;
    } catch (Exception e) {
      throw new Exception("Login Failed");
    }
  }

  @Override
  public String signup(SignUpRequestDTO signUpRequestDTO) {
    return null;
  }
}
