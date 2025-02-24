package com.project.foodieHub.controller;

import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.LoginRequestDTO;
import com.project.foodieHub.dto.SignUpRequestDTO;
import com.project.foodieHub.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
  public ResponseEntity<BaseAPIResponse> login(@RequestBody LoginRequestDTO loginRequestDTO) {
    BaseAPIResponse baseAPIResponse = new BaseAPIResponse();
    baseAPIResponse.setData(authService.login(loginRequestDTO));
    baseAPIResponse.setSuccessMessage("Logged In Successfully");
    baseAPIResponse.setHttpCode(HttpStatus.OK.value());
    return new ResponseEntity<>(baseAPIResponse, HttpStatus.OK);
  }

  @PostMapping("/signup")
  public ResponseEntity<BaseAPIResponse> signup(@RequestBody SignUpRequestDTO signUpRequestDTO)
      throws Exception {
    BaseAPIResponse baseAPIResponse = new BaseAPIResponse();
    baseAPIResponse.setData(authService.signup(signUpRequestDTO));
    baseAPIResponse.setSuccessMessage("Account Created Successfully");
    baseAPIResponse.setHttpCode(HttpStatus.OK.value());
    return new ResponseEntity<>(baseAPIResponse, HttpStatus.OK);
  }
}
