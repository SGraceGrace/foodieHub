package com.project.foodservice.document;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "slides")
@Data
public class Slide {

    @Id
    private String id;

    private String title;
    private String highlightWord;
    private String description;
    private String btn1Text;
    private String btn2Text;
    private String emoji;
    private String badgeIcon;
    private String badgeText;
    private int displayOrder = 0;
    private boolean active = true;
}
