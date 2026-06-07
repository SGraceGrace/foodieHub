package com.project.foodieHub.dto;

import lombok.Data;

import java.util.List;

@Data
public class PartnerRegisterRequestDTO {
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private String phone;
    private String restaurantName;
    private String restaurantAddress;
    private String fssaiNumber;
    private String gstNumber;
    private LocationDTO restaurantLocation;

    // Restaurant details collected at registration
    private List<String> cuisine;
    private String imageUrl;
    private int minOrder;
    private int deliveryTime;
    private String priceRange;
    private List<DayScheduleDTO> operatingHours;
}
