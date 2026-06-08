package com.project.foodservice.search.service.impl;

import com.project.foodservice.document.MenuItemDocument;
import com.project.foodservice.document.Restaurant;
import com.project.foodservice.repo.MenuItemRepo;
import com.project.foodservice.repo.RestaurantRepo;
import com.project.foodservice.search.doc.MenuItemSearchDoc;
import com.project.foodservice.search.doc.RestaurantSearchDoc;
import com.project.foodservice.search.dto.SearchResultDTO;
import com.project.foodservice.search.repo.MenuItemSearchRepo;
import com.project.foodservice.search.repo.RestaurantSearchRepo;
import com.project.foodservice.search.service.SearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {

    private final RestaurantSearchRepo restaurantSearchRepo;
    private final MenuItemSearchRepo   menuItemSearchRepo;
    private final RestaurantRepo       restaurantRepo;
    private final MenuItemRepo         menuItemRepo;
    private final ElasticsearchOperations elasticsearchOperations;

    // ── Public API ────────────────────────────────────────────────────

    @Override
    public SearchResultDTO search(String query) {
        try {
            NativeQuery restaurantQuery = NativeQuery.builder()
                    .withQuery(q -> q
                            .multiMatch(mm -> mm
                                    .fields("name^3", "address", "cuisine^2")
                                    .query(query)
                                    .fuzziness("AUTO")
                            )
                    )
                    .withPageable(PageRequest.of(0, 10))
                    .build();

            SearchHits<RestaurantSearchDoc> rHits =
                    elasticsearchOperations.search(restaurantQuery, RestaurantSearchDoc.class);

            List<SearchResultDTO.RestaurantResult> restaurants = rHits.getSearchHits().stream()
                    .map(h -> toRestaurantResult(h.getContent()))
                    .collect(Collectors.toList());

            NativeQuery menuQuery = NativeQuery.builder()
                    .withQuery(q -> q
                            .bool(b -> b
                                    .must(m -> m
                                            .multiMatch(mm -> mm
                                                    .fields("name^3", "description^2", "category", "restaurantName^2")
                                                    .query(query)
                                                    .fuzziness("AUTO")
                                            )
                                    )
                                    .filter(f -> f
                                            .term(t -> t
                                                    .field("available")
                                                    .value(true)
                                            )
                                    )
                            )
                    )
                    .withPageable(PageRequest.of(0, 15))
                    .build();

            SearchHits<MenuItemSearchDoc> mHits =
                    elasticsearchOperations.search(menuQuery, MenuItemSearchDoc.class);

            List<SearchResultDTO.MenuItemResult> menuItems = mHits.getSearchHits().stream()
                    .map(h -> toMenuItemResult(h.getContent()))
                    .collect(Collectors.toList());

            return new SearchResultDTO(restaurants, menuItems);
        } catch (Exception e) {
            log.warn("ES search unavailable for query '{}': {}", query, e.getMessage());
            return new SearchResultDTO(List.of(), List.of());
        }
    }

    @Override
    public void indexRestaurant(Restaurant r) {
        try {
            restaurantSearchRepo.save(toRestaurantDoc(r));
        } catch (Exception e) {
            log.warn("ES index failed for restaurant {}: {}", r.getId(), e.getMessage());
        }
    }

    @Override
    public void indexMenuItems(String restaurantId, List<MenuItemDocument> items) {
        try {
            String restaurantName = restaurantRepo.findById(restaurantId)
                    .map(Restaurant::getName).orElse("");

            // Replace: delete old ES docs for this restaurant, then re-index
            List<MenuItemSearchDoc> existing = menuItemSearchRepo.findByRestaurantId(restaurantId);
            if (!existing.isEmpty()) {
                menuItemSearchRepo.deleteAll(existing);
            }

            if (items == null || items.isEmpty()) return;

            List<MenuItemSearchDoc> docs = items.stream()
                    .map(item -> toMenuItemDoc(item, restaurantId, restaurantName))
                    .collect(Collectors.toList());

            menuItemSearchRepo.saveAll(docs);
        } catch (Exception e) {
            log.warn("ES index failed for menu items of restaurant {}: {}", restaurantId, e.getMessage());
        }
    }

    @Override
    public int reindex() {
        try {
            List<Restaurant> all = restaurantRepo.findAll();
            for (Restaurant r : all) {
                indexRestaurant(r);
                List<MenuItemDocument> items = menuItemRepo.findByRestaurantIdOrderByCategory(r.getId());
                indexMenuItems(r.getId(), items);
            }
            log.info("ES reindex complete — {} restaurants", all.size());
            return all.size();
        } catch (Exception e) {
            log.warn("ES reindex failed: {}", e.getMessage());
            return 0;
        }
    }

    // ── Mappers: MongoDB doc → ES doc ─────────────────────────────────

    private RestaurantSearchDoc toRestaurantDoc(Restaurant r) {
        RestaurantSearchDoc doc = new RestaurantSearchDoc();
        doc.setId(r.getId());
        doc.setName(r.getName());
        doc.setAddress(r.getAddress());
        doc.setCuisine(r.getCuisine());
        doc.setRating(r.getRating());
        doc.setRatingCount(r.getRatingCount());
        doc.setDeliveryTime(r.getDeliveryTime());
        doc.setMinOrder(r.getMinOrder());
        doc.setPriceRange(r.getPriceRange());
        doc.setOpen(r.isOpen());
        doc.setImageUrl(r.getImageUrl());
        return doc;
    }

    private MenuItemSearchDoc toMenuItemDoc(MenuItemDocument item, String restaurantId, String restaurantName) {
        MenuItemSearchDoc doc = new MenuItemSearchDoc();
        doc.setId(item.getId());
        doc.setRestaurantId(restaurantId);
        doc.setRestaurantName(restaurantName);
        doc.setCategory(item.getCategory());
        doc.setName(item.getName());
        doc.setPrice(item.getPrice());
        doc.setVeg(item.isVeg());
        doc.setAvailable(item.isAvailable());
        doc.setDescription(item.getDescription());
        doc.setImageUrl(item.getImageUrl());
        return doc;
    }

    // ── Mappers: ES doc → DTO ─────────────────────────────────────────

    private SearchResultDTO.RestaurantResult toRestaurantResult(RestaurantSearchDoc doc) {
        return new SearchResultDTO.RestaurantResult(
                doc.getId(), doc.getName(), doc.getAddress(), doc.getCuisine(),
                doc.getRating(), doc.getRatingCount(), doc.getDeliveryTime(),
                doc.getMinOrder(), doc.getPriceRange(), doc.isOpen(), doc.getImageUrl()
        );
    }

    private SearchResultDTO.MenuItemResult toMenuItemResult(MenuItemSearchDoc doc) {
        return new SearchResultDTO.MenuItemResult(
                doc.getId(), doc.getRestaurantId(), doc.getRestaurantName(),
                doc.getCategory(), doc.getName(), doc.getPrice(),
                doc.isVeg(), doc.getDescription(), doc.getImageUrl()
        );
    }
}
