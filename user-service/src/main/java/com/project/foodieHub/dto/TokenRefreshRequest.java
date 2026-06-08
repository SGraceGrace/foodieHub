package com.project.foodieHub.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TokenRefreshRequest {
  @NotNull(message = "refreshToken cannot be null")
  private String refreshToken;
}
