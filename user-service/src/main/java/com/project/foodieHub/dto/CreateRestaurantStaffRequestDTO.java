package com.project.foodieHub.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreateRestaurantStaffRequestDTO {
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private List<String> restaurantIds;
}
