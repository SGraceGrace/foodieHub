package com.project.foodieHub.service;

import com.project.foodieHub.dto.ContactMessageRequestDTO;
import com.project.foodieHub.entity.ContactMessage;

public interface ContactMessageService {
    ContactMessage save(ContactMessageRequestDTO dto);
}
