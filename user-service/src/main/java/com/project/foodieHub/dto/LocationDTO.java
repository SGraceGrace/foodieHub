package com.project.foodieHub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LocationDTO {
    private String city;
    private String state;
    private String country;
    private Double lat;
    private Double lng;
}
