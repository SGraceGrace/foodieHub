package com.project.foodieHub.messaging;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContactMessageEvent {
    private String name;
    private String email;
    private String subject;
}
