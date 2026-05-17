package com.project.foodieHub.controller;

import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.PartnerRegisterRequestDTO;
import com.project.foodieHub.service.PartnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class PartnerController {

    private final PartnerService partnerService;

    @PostMapping("api/v1/partner/register")
    public ResponseEntity<BaseAPIResponse> register(@RequestBody PartnerRegisterRequestDTO dto) {
        partnerService.register(dto);
        return ResponseEntity.ok(new BaseAPIResponse(
                "Registration successful. Your account is under review. We'll notify you once approved.",
                null, HttpStatus.OK.value(), null));
    }
}
