package com.project.foodieHub.controller;

import static com.project.foodieHub.constants.CommonConstants.SUCCESS;

import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.TokenRefreshRequest;
import com.project.foodieHub.service.RefreshTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/refresh-token")
@RequiredArgsConstructor
public class RefreshTokenController {

  private final RefreshTokenService refreshTokenService;

  @PostMapping
  public ResponseEntity<BaseAPIResponse> refreshToken(@Valid @RequestBody TokenRefreshRequest tokenRefreshRequest) {
    var tokens = refreshTokenService.refreshToken(tokenRefreshRequest);
    var response = new BaseAPIResponse();
    response.setSuccessMessage(SUCCESS);
    return ResponseEntity.ok()
        .header("Authorization", "Bearer " + tokens.getAccessToken())
        .header("X-Refresh-Token", tokens.getRefreshToken())
        .body(response);
  }
}
