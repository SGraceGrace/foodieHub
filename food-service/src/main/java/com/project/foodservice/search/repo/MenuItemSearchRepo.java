package com.project.foodservice.search.repo;

import com.project.foodservice.search.doc.MenuItemSearchDoc;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;

public interface MenuItemSearchRepo extends ElasticsearchRepository<MenuItemSearchDoc, String> {

    /**
     * Spring Data ES supports findBy* derived queries.
     * Used to fetch all docs for a restaurant so we can delete + re-index on menu save.
     */
    List<MenuItemSearchDoc> findByRestaurantId(String restaurantId);
}
