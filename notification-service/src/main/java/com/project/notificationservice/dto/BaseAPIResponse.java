package com.project.notificationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BaseAPIResponse {
    private String successMessage;
    private Object data;
    private int httpCode;
    private List<String> errorMsg;
}
