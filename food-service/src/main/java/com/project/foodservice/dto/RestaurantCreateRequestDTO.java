package com.project.foodservice.dto;

import lombok.Data;

@Data
public class RestaurantCreateRequestDTO {
    private String name;
    private String ownerId;
}
