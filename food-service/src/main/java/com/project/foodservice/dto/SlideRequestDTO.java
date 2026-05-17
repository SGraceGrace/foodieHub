package com.project.foodservice.dto;

import lombok.Data;

@Data
public class SlideRequestDTO {
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
