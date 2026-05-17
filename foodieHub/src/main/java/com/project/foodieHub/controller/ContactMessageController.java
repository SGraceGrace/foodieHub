package com.project.foodieHub.controller;

import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.ContactMessageRequestDTO;
import com.project.foodieHub.service.ContactMessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/contact")
@RequiredArgsConstructor
public class ContactMessageController {

    private final ContactMessageService contactMessageService;

    @PostMapping
    public ResponseEntity<BaseAPIResponse> submit(@Valid @RequestBody ContactMessageRequestDTO dto) {
        contactMessageService.save(dto);
        return ResponseEntity.ok(new BaseAPIResponse("Message received! We'll respond within 4 hours.", null, HttpStatus.OK.value(), null));
    }
}
