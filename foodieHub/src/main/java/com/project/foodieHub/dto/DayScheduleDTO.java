package com.project.foodieHub.dto;

import lombok.Data;

@Data
public class DayScheduleDTO {
    private String day;
    private boolean open;
    private String openTime;
    private String closeTime;
}
