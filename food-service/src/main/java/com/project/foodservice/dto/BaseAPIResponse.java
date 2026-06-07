package com.project.foodservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BaseAPIResponse {
    private String successMessage;
    private Object data;
    private int httpCode = HttpStatus.OK.value();
    private List<String> errorMsg;
}
