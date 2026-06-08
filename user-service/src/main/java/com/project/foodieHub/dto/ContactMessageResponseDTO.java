package com.project.foodieHub.dto;

import lombok.Data;

import java.util.Date;

@Data
public class ContactMessageResponseDTO {
    private Long id;
    private String name;
    private String email;
    private String subject;
    private String message;
    private Date createdDate;
    private boolean read;
}
