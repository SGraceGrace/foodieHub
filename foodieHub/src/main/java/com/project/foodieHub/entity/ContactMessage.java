package com.project.foodieHub.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Entity
@Table(name = "contact_message")
@Data
public class ContactMessage extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    @NotBlank
    private String name;

    @Column(name = "email", nullable = false)
    @NotBlank
    private String email;

    @Column(name = "subject", nullable = false)
    @NotBlank
    private String subject;

    @Column(name = "message", nullable = false, length = 2000)
    @NotBlank
    private String message;
}
