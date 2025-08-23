package com.project.foodieHub.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BaseAPIResponse {
    private String successMessage;
    private Object data;
    private int httpCode = HttpStatus.OK.value();
    private List<String> errorMsg;
}
