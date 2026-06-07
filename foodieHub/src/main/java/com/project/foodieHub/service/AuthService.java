package com.project.foodieHub.service;

import com.project.foodieHub.dto.JwtResponseDTO;
import com.project.foodieHub.dto.LoginRequestDTO;
import com.project.foodieHub.dto.SignUpRequestDTO;

public interface AuthService {

  public JwtResponseDTO login(LoginRequestDTO loginRequestDTO);

  public JwtResponseDTO signup(SignUpRequestDTO signUpRequestDTO);
}
