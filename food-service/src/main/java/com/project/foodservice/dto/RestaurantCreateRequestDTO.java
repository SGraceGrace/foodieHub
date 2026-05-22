package com.project.foodservice.dto;

import com.project.foodservice.document.DaySchedule;
import lombok.Data;

import java.util.List;

@Data
public class RestaurantCreateRequestDTO {
    private String name;
    private String ownerId;
    private String fssaiNumber;
    private String gstNumber;
    private String imageUrl;
    private LocationDTO location;
    private List<String> cuisine;
    private int minOrder;
    private int deliveryTime;
    private String priceRange;
    private List<DaySchedule> operatingHours;
}
