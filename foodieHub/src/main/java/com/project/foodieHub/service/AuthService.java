package com.project.foodieHub.service;

import com.project.foodieHub.dto.JwtResponseDTO;
import com.project.foodieHub.dto.LoginRequestDTO;
import com.project.foodieHub.dto.SignUpRequestDTO;
import com.project.foodieHub.exception_handler.UserAlreadyExistsException;

public interface AuthService {

  public JwtResponseDTO login(LoginRequestDTO loginRequestDTO) throws Exception;

  public JwtResponseDTO signup(SignUpRequestDTO signUpRequestDTO) throws Exception;
}
