package com.project.foodservice.search.controller;

import com.project.foodservice.dto.BaseAPIResponse;
import com.project.foodservice.search.dto.SearchResultDTO;
import com.project.foodservice.search.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    /**
     * GET /api/search?q=biryani
     * Returns matching restaurants and menu items in one shot.
     * Empty or blank query returns empty lists (no ES round-trip).
     */
    @GetMapping
    public ResponseEntity<BaseAPIResponse> search(@RequestParam(required = false) String q) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(
                    new BaseAPIResponse("ok", new SearchResultDTO(List.of(), List.of()), 200, null));
        }
        SearchResultDTO result = searchService.search(q.trim());
        return ResponseEntity.ok(new BaseAPIResponse("ok", result, 200, null));
    }

    /**
     * POST /api/search/reindex
     * Admin-only endpoint: rebuilds the entire ES index from MongoDB.
     * Call once after deploying or when ES data is stale.
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @PostMapping("/reindex")
    public ResponseEntity<BaseAPIResponse> reindex() {
        int count = searchService.reindex();
        return ResponseEntity.ok(
                new BaseAPIResponse("Reindexed " + count + " restaurants", null, 200, null));
    }
}
