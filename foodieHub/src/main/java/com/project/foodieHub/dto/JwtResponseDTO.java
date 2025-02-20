package com.project.foodieHub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class JwtResponseDTO {
  private String accessToken;
  private String refreshToken;
  private UserDetails user;
}
