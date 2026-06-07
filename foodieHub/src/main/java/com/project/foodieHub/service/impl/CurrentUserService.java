package com.project.foodieHub.service.impl;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

  public String getCurrentUsername() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    return authentication.getName(); // username from JWT
  }

  public Object getCurrentUserDetails() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    return authentication.getPrincipal(); // UserDetails object
  }

}
