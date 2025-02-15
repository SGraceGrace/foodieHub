package com.project.foodieHub.dto;

import lombok.Data;

@Data
public class BaseAPIResponse {
    private String successMessage;
    private Object data;
    private String errorMsg;
}
