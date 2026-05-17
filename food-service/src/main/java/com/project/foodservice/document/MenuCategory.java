package com.project.foodservice.document;

import lombok.Data;

import java.util.List;

@Data
public class MenuCategory {
    private String category;
    private List<MenuItem> items;
}
