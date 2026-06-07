package com.project.foodservice.search.repo;

import com.project.foodservice.search.doc.RestaurantSearchDoc;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface RestaurantSearchRepo extends ElasticsearchRepository<RestaurantSearchDoc, String> {
}
