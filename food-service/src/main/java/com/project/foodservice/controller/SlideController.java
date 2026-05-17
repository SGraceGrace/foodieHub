package com.project.foodservice.controller;

import com.project.foodservice.dto.BaseAPIResponse;
import com.project.foodservice.dto.SlideRequestDTO;
import com.project.foodservice.service.SlideService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<BaseAPIResponse> getAllSlides() {
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS", slideService.getAllSlides(), HttpStatus.OK.value(), null));
    }

    @PostMapping("api/v1/admin/slides")
    public ResponseEntity<BaseAPIResponse> create(@RequestBody SlideRequestDTO dto) {
        return ResponseEntity.ok(new BaseAPIResponse("Slide created", slideService.create(dto), HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/slides/{id}")
    public ResponseEntity<BaseAPIResponse> update(@PathVariable String id, @RequestBody SlideRequestDTO dto) {
        return ResponseEntity.ok(new BaseAPIResponse("Slide updated", slideService.update(id, dto), HttpStatus.OK.value(), null));
    }

    @DeleteMapping("api/v1/admin/slides/{id}")
    public ResponseEntity<BaseAPIResponse> delete(@PathVariable String id) {
        slideService.delete(id);
        return ResponseEntity.ok(new BaseAPIResponse("Slide deleted", null, HttpStatus.OK.value(), null));
    }

    @PutMapping("api/v1/admin/slides/{id}/toggle")
    public ResponseEntity<BaseAPIResponse> toggle(@PathVariable String id) {
        return ResponseEntity.ok(new BaseAPIResponse("Slide updated", slideService.toggleActive(id), HttpStatus.OK.value(), null));
    }
}
