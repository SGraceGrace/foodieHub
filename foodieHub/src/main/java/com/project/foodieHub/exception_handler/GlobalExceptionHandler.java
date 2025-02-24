package com.project.foodieHub.exception_handler;

import com.project.foodieHub.dto.BaseAPIResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(BadCredentialsException.class)
  public ResponseEntity<BaseAPIResponse> badCredentialsException(BadCredentialsException e) {
    var response = new BaseAPIResponse();
    response.setErrorMsg(e.getMessage());
    response.setHttpCode(HttpStatus.UNAUTHORIZED.value());
    return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
  }

  @ExceptionHandler(UserAlreadyExistsException.class)
  public ResponseEntity<BaseAPIResponse> userAlreadyExistsException(UserAlreadyExistsException e) {
    var response = new BaseAPIResponse();
    response.setErrorMsg(e.getMessage());
    response.setHttpCode(HttpStatus.BAD_REQUEST.value());
    return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
  }

  @ExceptionHandler(CommonException.class)
  public ResponseEntity<BaseAPIResponse> commonException(CommonException e) {
    var response = new BaseAPIResponse();
    response.setErrorMsg(e.getMessage());
    response.setHttpCode(HttpStatus.INTERNAL_SERVER_ERROR.value());
    return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  @ExceptionHandler(RefreshTokenException.class)
  public ResponseEntity<BaseAPIResponse> refreshTokenException(RefreshTokenException e) {
    var response = new BaseAPIResponse();
    response.setErrorMsg(e.getMessage());
    response.setHttpCode(HttpStatus.FORBIDDEN.value());
    return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
