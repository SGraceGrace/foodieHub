package com.project.foodservice.service.impl;

import com.project.foodservice.document.DaySchedule;
import com.project.foodservice.document.MenuCategory;
import com.project.foodservice.document.MenuItem;
import com.project.foodservice.document.Restaurant;
import com.project.foodservice.dto.PaginatedResponse;
import com.project.foodservice.dto.RestaurantCreateRequestDTO;
import com.project.foodservice.dto.RestaurantUpdateRequestDTO;
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
    public PaginatedResponse<Restaurant> getAll(String cuisine, Double lat, Double lng, Double radiusKm, Pageable pageable) {
        boolean hasLocation = lat != null && lng != null;
        double radius = (radiusKm != null) ? radiusKm : 10.0;

        List<Restaurant> all;
        if (cuisine != null && !cuisine.isBlank()) {
            all = restaurantRepo.findByStatusAndCuisineContainingIgnoreCase(RestaurantStatus.ACTIVE, cuisine, pageable).getContent();
        } else {
            all = restaurantRepo.findByStatus(RestaurantStatus.ACTIVE, pageable).getContent();
        }

        if (!hasLocation) {
            return PaginatedResponse.of(restaurantRepo.findByStatus(RestaurantStatus.ACTIVE, pageable));
        }

        List<Restaurant> nearby = all.stream()
            .filter(r -> r.getLat() != null && r.getLng() != null)
            .filter(r -> haversineKm(lat, lng, r.getLat(), r.getLng()) <= radius)
            .sorted((a, b) -> Double.compare(
                haversineKm(lat, lng, a.getLat(), a.getLng()),
                haversineKm(lat, lng, b.getLat(), b.getLng())))
            .collect(Collectors.toList());

        return PaginatedResponse.ofList(nearby, pageable);
    }

    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
        restaurant.setImageUrl(request.getImageUrl());
        restaurant.setLat(request.getLat());
        restaurant.setLng(request.getLng());
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
        r.setMenu(incoming);
        return restaurantRepo.save(r);
    }

    @Override
    public Restaurant updateDetails(String id, RestaurantUpdateRequestDTO req) {
        Restaurant r = restaurantRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));
        if (req.getName()         != null) r.setName(req.getName());
        if (req.getCuisine()      != null) r.setCuisine(req.getCuisine());
        if (req.getAddress()      != null) r.setAddress(req.getAddress());
        if (req.getDeliveryTime() != null) r.setDeliveryTime(req.getDeliveryTime());
        if (req.getMinOrder()     != null) r.setMinOrder(req.getMinOrder());
        if (req.getFssaiNumber()  != null) r.setFssaiNumber(req.getFssaiNumber());
        if (req.getGstNumber()    != null) r.setGstNumber(req.getGstNumber());
        if (req.getImageUrl()     != null) r.setImageUrl(req.getImageUrl());
        if (req.getLat()          != null) r.setLat(req.getLat());
        if (req.getLng()          != null) r.setLng(req.getLng());
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
