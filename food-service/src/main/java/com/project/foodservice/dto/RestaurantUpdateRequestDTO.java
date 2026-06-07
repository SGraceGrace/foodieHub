package com.project.foodservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class RestaurantUpdateRequestDTO {
    private String name;
    private String address;
    private List<String> cuisine;
    private Integer deliveryTime;
    private Integer minOrder;
    private String fssaiNumber;
    private String gstNumber;
    private String imageUrl;
    private LocationDTO location;
}
