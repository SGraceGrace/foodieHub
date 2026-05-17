package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.ContactMessageRequestDTO;
import com.project.foodieHub.entity.ContactMessage;
import com.project.foodieHub.repo.ContactMessageRepo;
import com.project.foodieHub.service.ContactMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ContactMessageServiceImpl implements ContactMessageService {

    private final ContactMessageRepo contactMessageRepo;

    @Override
    public ContactMessage save(ContactMessageRequestDTO dto) {
        ContactMessage message = new ContactMessage();
        message.setName(dto.getName());
        message.setEmail(dto.getEmail());
        message.setSubject(dto.getSubject());
        message.setMessage(dto.getMessage());
        return contactMessageRepo.save(message);
    }
}
