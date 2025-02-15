package com.project.foodieHub.controller;

import com.project.foodieHub.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/user/")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  @PreAuthorize("hasRole('ROLE_ADMIN')")
  @GetMapping("/test")
  public String test() {
    return "Everything is good";
  }
}
