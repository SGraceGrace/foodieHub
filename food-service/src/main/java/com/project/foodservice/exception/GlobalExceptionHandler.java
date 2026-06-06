package com.project.foodservice.exception;

import com.project.foodservice.dto.BaseAPIResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DuplicateRatingException.class)
    public ResponseEntity<BaseAPIResponse> duplicateRatingException(DuplicateRatingException e) {
        var response = new BaseAPIResponse();
        response.setErrorMsg(List.of(e.getMessage()));
        response.setHttpCode(HttpStatus.CONFLICT.value());
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class})
    public ResponseEntity<BaseAPIResponse> validationException(Exception ex) {
        BaseAPIResponse response = new BaseAPIResponse();
        if (ex instanceof MethodArgumentNotValidException e) {
            response.setErrorMsg(e.getBindingResult().getFieldErrors().stream()
                    .map(DefaultMessageSourceResolvable::getDefaultMessage)
                    .toList());
        } else if (ex instanceof ConstraintViolationException e) {
            response.setErrorMsg(e.getConstraintViolations().stream()
                    .map(ConstraintViolation::getMessage)
                    .toList());
        } else {
            response.setErrorMsg(List.of("Validation error"));
        }
        response.setHttpCode(HttpStatus.BAD_REQUEST.value());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<BaseAPIResponse> genericException(Exception e) {
        var response = new BaseAPIResponse();
        response.setErrorMsg(List.of(e.getMessage()));
        response.setHttpCode(HttpStatus.INTERNAL_SERVER_ERROR.value());
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
