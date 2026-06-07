package com.project.foodieHub.repo;

import com.project.foodieHub.entity.ContactMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactMessageRepo extends JpaRepository<ContactMessage, Long> {
    Page<ContactMessage> findAllByOrderByCreatedDateDesc(Pageable pageable);
    long countByReadFalse();
}
