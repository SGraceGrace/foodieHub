package com.project.foodservice.document;

import com.project.foodservice.enums.RestaurantStatus;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexType;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "restaurants")
@Data
public class Restaurant {

    @Id
    private String id;

    private String ownerId;

    @GeoSpatialIndexed(type = GeoSpatialIndexType.GEO_2DSPHERE)
    private GeoJsonPoint geoPoint;   // [longitude, latitude] — set whenever location.lat/lng is saved

    @Transient
    private Double distanceKm;       // populated by geo queries, never stored in MongoDB

    private String fssaiNumber;
    private String gstNumber;

    private String name;
    private String address;
    private List<String> cuisine;
    private double rating;
    private int ratingCount;
    private int deliveryTime;
    private boolean isOpen;
    private String imageUrl;
    private int minOrder;
    private String priceRange;
    private List<MenuCategory> menu;

    private RestaurantStatus status = RestaurantStatus.PENDING;

    private List<DaySchedule> operatingHours;

    private Location location;
}
