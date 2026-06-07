package com.project.foodieHub.exception_handler;

public class UserAlreadyExistsException extends RuntimeException{

  public UserAlreadyExistsException(String msg) {
    super(msg);
  }
}
