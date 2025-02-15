package com.project.foodieHub.service;

import com.project.foodieHub.dto.LoginRequestDTO;
import com.project.foodieHub.dto.SignUpRequestDTO;

public interface AuthService {

  public String login(LoginRequestDTO loginRequestDTO) throws Exception;

  public String signup(SignUpRequestDTO signUpRequestDTO);
}
