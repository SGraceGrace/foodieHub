package com.project.foodieHub.dto;

import java.util.List;
import lombok.Data;
import org.springframework.http.HttpStatus;

@Data
public class BaseAPIResponse {
    private String successMessage;
    private Object data;
    private int httpCode = HttpStatus.OK.value();
    private List<String> errorMsg;
}
