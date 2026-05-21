package com.project.foodservice.dto;

import lombok.Data;

@Data
public class RestaurantCreateRequestDTO {
    private String name;
    private String ownerId;
    private String fssaiNumber;
    private String gstNumber;
    private String imageUrl;
    private LocationDTO location;
}
