package com.project.foodieHub.controller;

import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.LoginRequestDTO;
import com.project.foodieHub.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @PostMapping("/login")
  public BaseAPIResponse login(@RequestBody LoginRequestDTO loginRequestDTO) {
    BaseAPIResponse baseAPIResponse = new BaseAPIResponse();
    try {
      baseAPIResponse.setData(authService.login(loginRequestDTO));
      baseAPIResponse.setSuccessMessage("Logged In Successfully");
      return baseAPIResponse;
    } catch(Exception e) {
      baseAPIResponse.setErrorMsg("Logged In Failed");
      return baseAPIResponse;
    }
  }
}
