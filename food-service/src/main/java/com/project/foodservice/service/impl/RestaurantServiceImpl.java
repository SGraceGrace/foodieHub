package com.project.foodservice.service.impl;

import com.project.foodservice.document.DaySchedule;
import com.project.foodservice.document.MenuCategory;
import com.project.foodservice.document.MenuItem;
import com.project.foodservice.document.Restaurant;
import com.project.foodservice.dto.PaginatedResponse;
import com.project.foodservice.dto.RestaurantCreateRequestDTO;
import com.project.foodservice.enums.RestaurantStatus;
import com.project.foodservice.repo.RestaurantRepo;
import com.project.foodservice.service.RestaurantService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class RestaurantServiceImpl implements RestaurantService {

    private final RestaurantRepo restaurantRepo;

    @Override
    public PaginatedResponse<Restaurant> getAll(String cuisine, Pageable pageable) {
        if (cuisine != null && !cuisine.isBlank()) {
            return PaginatedResponse.of(
                restaurantRepo.findByStatusAndCuisineContainingIgnoreCase(RestaurantStatus.ACTIVE, cuisine, pageable)
            );
        }
        return PaginatedResponse.of(restaurantRepo.findByStatus(RestaurantStatus.ACTIVE, pageable));
    }

    @Override
    public Restaurant getById(String id) {
        return restaurantRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));
    }

    @Override
    public List<String> getCuisines() {
        return restaurantRepo.findAllCuisineFields().stream()
                .filter(r -> r.getCuisine() != null)
                .flatMap(r -> r.getCuisine().stream())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    @Override
    public Restaurant create(RestaurantCreateRequestDTO request) {
        Restaurant restaurant = new Restaurant();
        restaurant.setName(request.getName());
        restaurant.setOwnerId(request.getOwnerId());
        restaurant.setAddress(request.getAddress());
        restaurant.setFssaiNumber(request.getFssaiNumber());
        restaurant.setGstNumber(request.getGstNumber());
        return restaurantRepo.save(restaurant);
    }

    @Override
    public PaginatedResponse<Restaurant> getByOwner(String ownerId, Pageable pageable) {
        return PaginatedResponse.of(restaurantRepo.findByOwnerId(ownerId, pageable));
    }

    @Override
    public PaginatedResponse<Restaurant> getAllForAdmin(String status, String cuisine, Pageable pageable) {
        boolean hasStatus = status != null && !status.isBlank();
        boolean hasCuisine = cuisine != null && !cuisine.isBlank();

        if (hasStatus && hasCuisine) {
            return PaginatedResponse.of(
                restaurantRepo.findByStatusAndCuisineContainingIgnoreCase(RestaurantStatus.valueOf(status), cuisine, pageable));
        }
        if (hasStatus) {
            return PaginatedResponse.of(restaurantRepo.findByStatus(RestaurantStatus.valueOf(status), pageable));
        }
        if (hasCuisine) {
            return PaginatedResponse.of(restaurantRepo.findByCuisineContainingIgnoreCase(cuisine, pageable));
        }
        return PaginatedResponse.of(restaurantRepo.findAll(pageable));
    }

    @Override
    public void updateStatusByOwnerId(String ownerId, RestaurantStatus status) {
        List<Restaurant> restaurants = restaurantRepo.findByOwnerId(ownerId);
        restaurants.forEach(r -> r.setStatus(status));
        restaurantRepo.saveAll(restaurants);
    }

    @Override
    public Restaurant updateHours(String id, List<DaySchedule> hours) {
        Restaurant r = restaurantRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));
        r.setOperatingHours(hours);
        r.setOpen(computeIsOpen(r));
        return restaurantRepo.save(r);
    }

    @Override
    public Restaurant updateMenu(String id, List<MenuCategory> incoming) {
        Restaurant r = restaurantRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));

        List<MenuCategory> merged = r.getMenu() != null ? new java.util.ArrayList<>(r.getMenu()) : new java.util.ArrayList<>();

        for (MenuCategory inCat : incoming) {
            merged.stream()
                  .filter(c -> c.getCategory().equalsIgnoreCase(inCat.getCategory()))
                  .findFirst()
                  .ifPresentOrElse(
                      existing -> {
                          List<MenuItem> items = existing.getItems() != null
                                  ? new java.util.ArrayList<>(existing.getItems()) : new java.util.ArrayList<>();
                          if (inCat.getItems() != null) items.addAll(inCat.getItems());
                          existing.setItems(items);
                      },
                      () -> merged.add(inCat)
                  );
        }

        r.setMenu(merged);
        return restaurantRepo.save(r);
    }

    public static boolean computeIsOpen(Restaurant r) {
        List<DaySchedule> hours = r.getOperatingHours();
        if (hours == null || hours.isEmpty()) return r.isOpen();

        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"));
        String today = now.getDayOfWeek().name();
        LocalTime current = now.toLocalTime();

        return hours.stream()
                .filter(h -> today.equalsIgnoreCase(h.getDay()) && h.isOpen())
                .findFirst()
                .map(h -> {
                    LocalTime open  = LocalTime.parse(h.getOpenTime());
                    LocalTime close = LocalTime.parse(h.getCloseTime());
                    return !current.isBefore(open) && current.isBefore(close);
                })
                .orElse(false);
    }
}
