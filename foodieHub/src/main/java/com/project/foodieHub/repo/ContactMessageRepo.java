package com.project.foodieHub.repo;

import com.project.foodieHub.entity.ContactMessage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactMessageRepo extends JpaRepository<ContactMessage, Long> {
}
