package com.project.foodieHub.controller;

import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.LoginRequestDTO;
import com.project.foodieHub.dto.SignUpRequestDTO;
import com.project.foodieHub.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @PostMapping("/login")
  public ResponseEntity login(@Valid @RequestBody LoginRequestDTO loginRequestDTO) {
    var data = authService.login(loginRequestDTO);
    return ResponseEntity.ok().header("Authorization", "Bearer " + data.getAccessToken())
        .header("X-Refresh-Token", data.getRefreshToken()).body(new BaseAPIResponse("Login Successfully!", null, HttpStatus.OK.value(), null));
  }

  @PostMapping("/signup")
  public ResponseEntity<BaseAPIResponse> signup(@Valid @RequestBody SignUpRequestDTO signUpRequestDTO) {
    var data = authService.signup(signUpRequestDTO);
    return ResponseEntity.ok().header("Authorization", "Bearer " + data.getAccessToken())
        .header("X-Refresh-Token", data.getRefreshToken()).body(new BaseAPIResponse("Signup Successfully!", null, HttpStatus.OK.value(), null));
  }
}
