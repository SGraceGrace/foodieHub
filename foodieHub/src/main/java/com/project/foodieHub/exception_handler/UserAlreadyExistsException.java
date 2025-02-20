package com.project.foodieHub.exception_handler;

public class UserAlreadyExistsException extends Exception{

  public UserAlreadyExistsException(String msg) {
    super(msg);
  }
}
