package com.project.foodieHub.dto;

import lombok.Data;
import org.springframework.http.HttpStatus;

@Data
public class BaseAPIResponse {
    private String successMessage;
    private Object data;
    private int httpCode;
    private String errorMsg;
}
