package com.project.foodieHub.exception_handler;

public class AccountPendingException extends RuntimeException {
    public AccountPendingException(String message) {
        super(message);
    }
}
