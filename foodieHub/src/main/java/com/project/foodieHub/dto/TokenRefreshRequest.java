package com.project.foodieHub.dto;

import lombok.Data;

@Data
public class TokenRefreshRequest {
  private String refreshToken;
}
