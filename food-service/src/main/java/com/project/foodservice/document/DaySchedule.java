package com.project.foodservice.document;

import lombok.Data;

@Data
public class DaySchedule {
    private String day;       // "MONDAY", "TUESDAY", …
    private boolean open;
    private String openTime;  // "09:00"
    private String closeTime; // "22:00"
}
