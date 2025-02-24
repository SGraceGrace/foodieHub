package com.project.foodieHub.controller;

import static com.project.foodieHub.constants.CommonConstants.SUCCESS;

import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.TokenRefreshRequest;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.exception_handler.RefreshTokenException;
import com.project.foodieHub.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/refresh-token")
@RequiredArgsConstructor
public class RefreshTokenController {

  private final RefreshTokenService refreshTokenService;

  @PostMapping
  public ResponseEntity<BaseAPIResponse> refreshToken(@RequestBody TokenRefreshRequest tokenRefreshRequest) {
    var response = new BaseAPIResponse();
    response.setData(refreshTokenService.refreshToken(tokenRefreshRequest));
    response.setSuccessMessage(SUCCESS);
    return new ResponseEntity<>(response, HttpStatus.OK);
  }
}
