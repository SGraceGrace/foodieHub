package com.project.foodieHub.filter;

import com.project.foodieHub.jwtService.JwtService;
import com.project.foodieHub.service.impl.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class AuthFilter extends OncePerRequestFilter {

  private final JwtService jwtService;
  private final UserDetailsServiceImpl userDetailsService;

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    String token = extractToken(request);

    if (Objects.nonNull(token) && jwtService.validateToken(token)) {
      String username = jwtService.extractUserName(token);
      UserDetails userDetails = userDetailsService.loadUserByUsername(username);
      UsernamePasswordAuthenticationToken usernamePasswordAuthenticationToken = new UsernamePasswordAuthenticationToken(
          userDetails, null, userDetails.getAuthorities()
      );
      usernamePasswordAuthenticationToken.setDetails(
          new WebAuthenticationDetailsSource().buildDetails(request));
      SecurityContextHolder.getContext().setAuthentication(usernamePasswordAuthenticationToken);
    }
    filterChain.doFilter(request, response);
  }

  private String extractToken(HttpServletRequest request) {
    String header = request.getHeader("Authorization");
    if (Objects.nonNull(header) && header.startsWith("Bearer")) {
      return header.substring(7);
    }
    return null;
  }
}
