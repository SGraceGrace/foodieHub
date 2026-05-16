package com.project.foodieHub.controller;

import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.UpdateProfileRequestDTO;
import com.project.foodieHub.service.UserService;
import com.project.foodieHub.service.impl.CurrentUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/v1/user")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;
  private final CurrentUserService currentUserService;

  @PreAuthorize("hasRole('END_USERS')")
  @GetMapping("/test")
  public String test() {
    return "Everything is good";
  }

  @GetMapping
  public ResponseEntity<BaseAPIResponse> getUserInfo() {
    var username = currentUserService.getCurrentUsername();
    var apiResponse = new BaseAPIResponse("SUCCESS", userService.getUser(username), HttpStatus.OK.value(), null);
    return new ResponseEntity<>(apiResponse, HttpStatus.OK);
  }

  @PutMapping("/profile")
  public ResponseEntity<BaseAPIResponse> updateProfile(@Valid @RequestBody UpdateProfileRequestDTO dto) {
    var username = currentUserService.getCurrentUsername();
    userService.updateProfile(username, dto);
    var apiResponse = new BaseAPIResponse("Profile updated successfully", null, HttpStatus.OK.value(), null);
    return new ResponseEntity<>(apiResponse, HttpStatus.OK);
  }
}
