package com.project.foodieHub.controller;

import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.SlideRequestDTO;
import com.project.foodieHub.service.SlideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class SlideController {

    private final SlideService slideService;

    @GetMapping("api/v1/slides")
    public ResponseEntity<BaseAPIResponse> getActiveSlides() {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS", slideService.getActiveSlides(), HttpStatus.OK.value(), null));
    }

    @GetMapping("api/v1/admin/slides")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseAPIResponse> getAllSlides() {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS", slideService.getAllSlides(), HttpStatus.OK.value(), null));
    }

    @PostMapping("api/v1/admin/slides")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseAPIResponse> create(@Valid @RequestBody SlideRequestDTO dto) {
        return ResponseEntity.ok(new BaseAPIResponse("Slide created", slideService.create(dto), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/slides/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseAPIResponse> update(@PathVariable Long id, @Valid @RequestBody SlideRequestDTO dto) {
        return ResponseEntity.ok(new BaseAPIResponse("Slide updated", slideService.update(id, dto), HttpStatus.OK.value(), null));
    }

    @DeleteMapping("api/v1/admin/slides/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseAPIResponse> delete(@PathVariable Long id) {
        slideService.delete(id);
        return ResponseEntity.ok(new BaseAPIResponse("Slide deleted", null, HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/slides/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseAPIResponse> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseAPIResponse("Slide updated", slideService.toggleActive(id), HttpStatus.OK.value(), null));
    }
}
