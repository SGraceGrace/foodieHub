package com.project.foodservice.search.doc;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;

import java.util.List;

@Document(indexName = "restaurants", createIndex = false)
@Data
public class RestaurantSearchDoc {

    @Id
    private String id;

    private String name;
    private String address;
    private List<String> cuisine;

    private double rating;
    private int    ratingCount;
    private int    deliveryTime;
    private int    minOrder;
    private String priceRange;

    /** Matches the Jackson-serialized field name from Restaurant.isOpen (Lombok getter isOpen() → "open") */
    private boolean open;
    private String  imageUrl;
}
