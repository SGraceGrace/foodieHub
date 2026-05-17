package com.project.foodservice.document;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "restaurants")
@Data
public class Restaurant {

    @Id
    private String id;

    private String name;
    private List<String> cuisine;
    private double rating;
    private int deliveryTime;
    private boolean isOpen;
    private String imageUrl;
    private String address;
    private int minOrder;
    private String priceRange;
    private List<MenuCategory> menu;
}
