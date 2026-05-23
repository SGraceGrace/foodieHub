package com.project.foodieHub.service;

import com.project.foodieHub.dto.ContactMessageRequestDTO;
import com.project.foodieHub.dto.ContactMessageResponseDTO;
import com.project.foodieHub.dto.PaginatedResponse;
import com.project.foodieHub.entity.ContactMessage;
import org.springframework.data.domain.Pageable;

public interface ContactMessageService {
    ContactMessage save(ContactMessageRequestDTO dto);
    PaginatedResponse<ContactMessageResponseDTO> getAll(Pageable pageable);
    void markAsRead(Long id);
    long getUnreadCount();
}
