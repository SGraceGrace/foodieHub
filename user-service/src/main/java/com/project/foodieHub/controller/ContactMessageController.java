package com.project.foodieHub.controller;

import com.project.foodieHub.constants.CommonConstants;
import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.ContactMessageRequestDTO;
import com.project.foodieHub.service.ContactMessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1")
@RequiredArgsConstructor
public class ContactMessageController {

    private final ContactMessageService contactMessageService;

    @PostMapping("/contact")
    public ResponseEntity<BaseAPIResponse> submit(@Valid @RequestBody ContactMessageRequestDTO dto) {
        contactMessageService.save(dto);
        return ResponseEntity.ok(new BaseAPIResponse("Message received! We'll respond within 4 hours.", null, HttpStatus.OK.value(), null));
    }

    @GetMapping("/admin/contact-messages")
    public ResponseEntity<BaseAPIResponse> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                contactMessageService.getAll(PageRequest.of(page, size)),
                HttpStatus.OK.value(), null));
    }

    @GetMapping("/admin/contact-messages/unread-count")
    public ResponseEntity<BaseAPIResponse> getUnreadCount() {
        return ResponseEntity.ok(new BaseAPIResponse(CommonConstants.SUCCESS,
                contactMessageService.getUnreadCount(), HttpStatus.OK.value(), null));
    }

    @PatchMapping("/admin/contact-messages/{id}/read")
    public ResponseEntity<BaseAPIResponse> markAsRead(@PathVariable Long id) {
        contactMessageService.markAsRead(id);
        return ResponseEntity.ok(new BaseAPIResponse("Marked as read", null, HttpStatus.OK.value(), null));
    }
}
