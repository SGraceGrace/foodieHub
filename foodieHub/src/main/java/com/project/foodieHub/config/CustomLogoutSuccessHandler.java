package com.project.foodieHub.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;

public class CustomLogoutSuccessHandler implements LogoutSuccessHandler {

  private static final Logger log = LoggerFactory.getLogger(CustomLogoutSuccessHandler.class);

  @Override
  public void onLogoutSuccess(HttpServletRequest request, HttpServletResponse response,
      Authentication authentication) throws IOException {
    SecurityContextHolder.clearContext();
    log.info("Logout successful");
    response.setStatus(HttpServletResponse.SC_OK);
    response.getWriter().write("Logout successful");
  }
}
