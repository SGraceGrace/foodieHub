package com.project.orderservice.exception;

public class OrderConflictException extends RuntimeException {
    public OrderConflictException(String message) {
        super(message);
    }
}
