package com.project.foodieHub.exception_handler;

import com.project.foodieHub.dto.BaseAPIResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(AccountPendingException.class)
  public ResponseEntity<BaseAPIResponse> accountPendingException(AccountPendingException e) {
    var response = new BaseAPIResponse();
    response.setErrorMsg(List.of(e.getMessage()));
    response.setHttpCode(HttpStatus.FORBIDDEN.value());
    return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
  }

  @ExceptionHandler(BadCredentialsException.class)
  public ResponseEntity<BaseAPIResponse> badCredentialsException(BadCredentialsException e) {
    var response = new BaseAPIResponse();
    response.setErrorMsg(List.of(e.getMessage()));
    response.setHttpCode(HttpStatus.UNAUTHORIZED.value());
    return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
  }

  @ExceptionHandler(UserAlreadyExistsException.class)
  public ResponseEntity<BaseAPIResponse> userAlreadyExistsException(UserAlreadyExistsException e) {
    var response = new BaseAPIResponse();
    response.setErrorMsg(List.of(e.getMessage()));
    response.setHttpCode(HttpStatus.BAD_REQUEST.value());
    return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
  }

  @ExceptionHandler(CommonException.class)
  public ResponseEntity<BaseAPIResponse> commonException(CommonException e) {
    var response = new BaseAPIResponse();
    response.setErrorMsg(List.of(e.getMessage()));
    response.setHttpCode(HttpStatus.INTERNAL_SERVER_ERROR.value());
    return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  @ExceptionHandler(RefreshTokenException.class)
  public ResponseEntity<BaseAPIResponse> refreshTokenException(RefreshTokenException e) {
    var response = new BaseAPIResponse();
    response.setErrorMsg(List.of(e.getMessage()));
    response.setHttpCode(HttpStatus.UNAUTHORIZED.value());
    return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
  }

  @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class})
  public ResponseEntity<BaseAPIResponse> validationException(Exception ex) {
    BaseAPIResponse response = new BaseAPIResponse();

    if (ex instanceof MethodArgumentNotValidException e) {
      List<String> errorMessages = e.getBindingResult()
          .getFieldErrors()
          .stream()
          .map(DefaultMessageSourceResolvable::getDefaultMessage)
          .toList();
      response.setErrorMsg(errorMessages);
    } else if (ex instanceof ConstraintViolationException e) {
      List<String> errorMessages = e.getConstraintViolations()
          .stream()
          .map(ConstraintViolation::getMessage)
          .toList();
      response.setErrorMsg(errorMessages);
    } else {
      response.setErrorMsg(List.of("Validation error"));
    }

    response.setHttpCode(HttpStatus.BAD_REQUEST.value());
    return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
  }

}
