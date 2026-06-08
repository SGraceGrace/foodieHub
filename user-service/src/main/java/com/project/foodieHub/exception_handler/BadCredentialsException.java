package com.project.foodieHub.exception_handler;

public class BadCredentialsException extends RuntimeException{

  public BadCredentialsException(String msg) {
    super(msg);
  }
}
