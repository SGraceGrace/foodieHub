package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.ContactMessageRequestDTO;
import com.project.foodieHub.dto.ContactMessageResponseDTO;
import com.project.foodieHub.dto.PaginatedResponse;
import com.project.foodieHub.entity.ContactMessage;
import com.project.foodieHub.messaging.ContactMessageEvent;
import com.project.foodieHub.messaging.RabbitMQConfig;
import com.project.foodieHub.repo.ContactMessageRepo;
import com.project.foodieHub.service.ContactMessageService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ContactMessageServiceImpl implements ContactMessageService {

    private final ContactMessageRepo contactMessageRepo;
    private final RabbitTemplate rabbitTemplate;

    @Override
    public ContactMessage save(ContactMessageRequestDTO dto) {
        ContactMessage message = new ContactMessage();
        message.setName(dto.getName());
        message.setEmail(dto.getEmail());
        message.setSubject(dto.getSubject());
        message.setMessage(dto.getMessage());
        ContactMessage saved = contactMessageRepo.save(message);

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.CONTACT_RKEY,
                new ContactMessageEvent(saved.getName(), saved.getEmail(), saved.getSubject())
        );

        return saved;
    }

    @Override
    public PaginatedResponse<ContactMessageResponseDTO> getAll(Pageable pageable) {
        Page<ContactMessage> page = contactMessageRepo.findAllByOrderByCreatedDateDesc(pageable);
        List<ContactMessageResponseDTO> content = page.getContent().stream()
                .map(this::toDTO)
                .toList();
        return new PaginatedResponse<>(content, page.getNumber(), page.getTotalPages(), page.getTotalElements(), page.getSize());
    }

    @Override
    public void markAsRead(Long id) {
        ContactMessage msg = contactMessageRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Contact message not found: " + id));
        if (!msg.isRead()) {
            msg.setRead(true);
            contactMessageRepo.save(msg);
        }
    }

    @Override
    public long getUnreadCount() {
        return contactMessageRepo.countByReadFalse();
    }

    private ContactMessageResponseDTO toDTO(ContactMessage m) {
        ContactMessageResponseDTO dto = new ContactMessageResponseDTO();
        dto.setId(m.getId());
        dto.setName(m.getName());
        dto.setEmail(m.getEmail());
        dto.setSubject(m.getSubject());
        dto.setMessage(m.getMessage());
        dto.setCreatedDate(m.getCreatedDate());
        dto.setRead(m.isRead());
        return dto;
    }
}
