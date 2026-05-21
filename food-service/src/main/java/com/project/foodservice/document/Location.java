package com.project.foodservice.document;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Location {
    private String city;
    private String state;
    private String country;
    private Double lat;
    private Double lng;
}
