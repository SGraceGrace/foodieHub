package com.project.foodieHub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SlideRequestDTO {

    @NotBlank(message = "Title cannot be blank")
    private String title;

    private String highlightWord;
    private String description;
    private String btn1Text;
    private String btn2Text;
    private String emoji;
    private String badgeIcon;
    private String badgeText;
    private int displayOrder;
}
