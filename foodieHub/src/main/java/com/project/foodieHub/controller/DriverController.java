package com.project.foodieHub.controller;

import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.DriverRegisterRequestDTO;
import com.project.foodieHub.service.DriverService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;

    @PostMapping("api/v1/driver/register")
    public ResponseEntity<BaseAPIResponse> register(@RequestBody DriverRegisterRequestDTO dto) {
        driverService.register(dto);
        return ResponseEntity.ok(new BaseAPIResponse(
                "Registration successful. Your account is under review. We'll notify you once approved.",
                null, HttpStatus.OK.value(), null));
    }
}
