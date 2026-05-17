package com.project.foodieHub.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "slide")
@Data
public class Slide extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "highlight_word")
    private String highlightWord;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "btn1_text")
    private String btn1Text;

    @Column(name = "btn2_text")
    private String btn2Text;

    @Column(name = "emoji")
    private String emoji;

    @Column(name = "badge_icon")
    private String badgeIcon;

    @Column(name = "badge_text")
    private String badgeText;

    @Column(name = "display_order")
    private int displayOrder = 0;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}
