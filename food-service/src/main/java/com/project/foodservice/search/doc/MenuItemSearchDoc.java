package com.project.foodservice.search.doc;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;

@Document(indexName = "menu_items_search")
@Data
public class MenuItemSearchDoc {

    @Id
    private String id;

    private String restaurantId;
    private String restaurantName;   // denormalised — avoids a join in search results
    private String category;

    private String  name;
    private double  price;
    private boolean veg;             // matches MenuItemDocument.isVeg() → "veg" after Lombok
    private boolean available;
    private String  description;
    private String  imageUrl;
}
