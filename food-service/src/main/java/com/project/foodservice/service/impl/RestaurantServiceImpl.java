package com.project.foodservice.service.impl;

import com.project.foodservice.document.DaySchedule;
import com.project.foodservice.document.Location;
import com.project.foodservice.document.MenuCategory;
import com.project.foodservice.document.MenuItem;
import com.project.foodservice.document.OwnerApproval;
import com.project.foodservice.document.Rating;
import com.project.foodservice.document.Restaurant;
import com.project.foodservice.dto.PaginatedResponse;
import com.project.foodservice.dto.RestaurantCreateRequestDTO;
import com.project.foodservice.dto.RestaurantUpdateRequestDTO;
import com.project.foodservice.enums.RestaurantStatus;
import com.project.foodservice.repo.OwnerApprovalRepo;
import com.project.foodservice.repo.RatingRepo;
import com.project.foodservice.repo.RestaurantRepo;
import com.project.foodservice.service.RestaurantService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class RestaurantServiceImpl implements RestaurantService {

    private final RestaurantRepo restaurantRepo;
    private final OwnerApprovalRepo ownerApprovalRepo;
    private final RatingRepo ratingRepo;

    @Override
    public PaginatedResponse<Restaurant> getAll(String cuisine, Double lat, Double lng, Double radiusKm, String sort, Pageable pageable) {
        boolean hasCuisine  = cuisine != null && !cuisine.isBlank();
        boolean hasLocation = lat != null && lng != null;
        double  radius      = (radiusKm != null) ? radiusKm : 10.0;

        // Rebuild pageable with the requested sort for DB-level ordering
        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), toSort(sort));

        // No location provided — let MongoDB handle sorting
        if (!hasLocation) {
            if (hasCuisine) {
                return PaginatedResponse.of(
                    restaurantRepo.findByStatusAndCuisineContainingIgnoreCase(RestaurantStatus.ACTIVE, cuisine, sortedPageable));
            }
            return PaginatedResponse.of(restaurantRepo.findByStatus(RestaurantStatus.ACTIVE, sortedPageable));
        }

        // Location provided — fetch candidates, filter by proximity, then sort
        // Use original pageable (no sort) for fetching; sorting happens in-memory after proximity filter
        List<Restaurant> candidates = hasCuisine
            ? restaurantRepo.findByStatusAndCuisineContainingIgnoreCase(RestaurantStatus.ACTIVE, cuisine, pageable).getContent()
            : restaurantRepo.findByStatus(RestaurantStatus.ACTIVE, pageable).getContent();

        Comparator<Restaurant> comparator = toComparator(sort, lat, lng);
        List<Restaurant> nearby = candidates.stream()
            .filter(r -> r.getLocation() != null
                      && r.getLocation().getLat() != null
                      && r.getLocation().getLng() != null)
            .filter(r -> haversineKm(lat, lng, r.getLocation().getLat(), r.getLocation().getLng()) <= radius)
            .sorted(comparator)
            .collect(Collectors.toList());

        return PaginatedResponse.ofList(nearby, pageable);
    }

    /** Maps the frontend sort token to a MongoDB Sort directive. */
    private Sort toSort(String sort) {
        if (sort == null) return Sort.unsorted();
        return switch (sort) {
            case "deliveryTime" -> Sort.by(Sort.Direction.ASC,  "deliveryTime");
            case "priceLow"     -> Sort.by(Sort.Direction.ASC,  "minOrder");
            case "priceHigh"    -> Sort.by(Sort.Direction.DESC, "minOrder");
            case "rating"       -> Sort.by(Sort.Direction.DESC, "rating");
            default             -> Sort.unsorted(); // "relevance" → DB default
        };
    }

    /** Maps the frontend sort token to an in-memory Comparator for the proximity path. */
    private Comparator<Restaurant> toComparator(String sort, Double lat, Double lng) {
        // Sort by actual distance — used for "deliveryTime" (closest = fastest delivery)
        Comparator<Restaurant> byDistance = Comparator.comparingDouble(r ->
            haversineKm(lat, lng, r.getLocation().getLat(), r.getLocation().getLng()));

        // No-op comparator — preserves the fetch order from DB (used for "relevance")
        // Proximity filter still applies (only nearby restaurants are included),
        // but we don't impose any ordering on top of that
        Comparator<Restaurant> noSort = (a, b) -> 0;

        if (sort == null || sort.equals("relevance")) return noSort;

        return switch (sort) {
            // deliveryTime = sort ascending by actual distance (closest = fastest delivery)
            case "deliveryTime" -> byDistance;
            case "priceLow"     -> Comparator.comparingInt(Restaurant::getMinOrder);
            case "priceHigh"    -> Comparator.comparingInt(Restaurant::getMinOrder).reversed();
            case "rating"       -> Comparator.comparingDouble(Restaurant::getRating).reversed();
            default             -> noSort;
        };
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
        restaurant.setAddress(request.getAddress());
        restaurant.setOwnerId(request.getOwnerId());
        restaurant.setFssaiNumber(request.getFssaiNumber());
        restaurant.setGstNumber(request.getGstNumber());
        restaurant.setImageUrl(request.getImageUrl());
        if (request.getLocation() != null) {
            var l = request.getLocation();
            restaurant.setLocation(new Location(l.getCity(), l.getState(), l.getCountry(), l.getLat(), l.getLng()));
        }
        if (request.getCuisine() != null)       restaurant.setCuisine(request.getCuisine());
        if (request.getMinOrder() > 0)          restaurant.setMinOrder(request.getMinOrder());
        if (request.getDeliveryTime() > 0)      restaurant.setDeliveryTime(request.getDeliveryTime());
        if (request.getPriceRange() != null)    restaurant.setPriceRange(request.getPriceRange());
        if (request.getOperatingHours() != null) {
            restaurant.setOperatingHours(request.getOperatingHours());
            restaurant.setOpen(computeIsOpen(restaurant));
        }
        boolean approved = ownerApprovalRepo.findById(request.getOwnerId())
                .map(OwnerApproval::isApproved).orElse(false);
        restaurant.setStatus(approved ? RestaurantStatus.ACTIVE : RestaurantStatus.PENDING);
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
    public Restaurant updateDetails(String id, RestaurantUpdateRequestDTO req) {
        Restaurant r = restaurantRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));
        if (req.getName()         != null) r.setName(req.getName());
        if (req.getAddress()      != null) r.setAddress(req.getAddress());
        if (req.getCuisine()      != null) r.setCuisine(req.getCuisine());
        if (req.getDeliveryTime() != null) r.setDeliveryTime(req.getDeliveryTime());
        if (req.getMinOrder()     != null) r.setMinOrder(req.getMinOrder());
        if (req.getFssaiNumber()  != null) r.setFssaiNumber(req.getFssaiNumber());
        if (req.getGstNumber()    != null) r.setGstNumber(req.getGstNumber());
        if (req.getImageUrl()     != null) r.setImageUrl(req.getImageUrl());
        if (req.getLocation()     != null) {
            var l = req.getLocation();
            r.setLocation(new Location(l.getCity(), l.getState(), l.getCountry(), l.getLat(), l.getLng()));
        }
        return restaurantRepo.save(r);
    }

    @Override
    public Restaurant addRating(String restaurantId, double newRating, String customerId, String orderId) {
        // Duplicate guard — one rating per order (DB unique index is the real guard, this is the friendly message)
        if (ratingRepo.existsByOrderId(orderId)) {
            throw new IllegalStateException("Order has already been rated");
        }

        Restaurant r = restaurantRepo.findById(restaurantId)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));

        // Persist the individual rating document
        Rating rating = new Rating();
        rating.setRestaurantId(restaurantId);
        rating.setCustomerId(customerId);
        rating.setOrderId(orderId);
        rating.setRating(newRating);
        ratingRepo.save(rating);

        // Recalculate avg from all stored ratings — source of truth, not a rolling estimate
        List<Rating> allRatings = ratingRepo.findByRestaurantId(restaurantId);
        double avg = allRatings.stream().mapToDouble(Rating::getRating).average().orElse(newRating);

        // Round to 1 decimal place (e.g. 4.2666 → 4.3)
        r.setRating(Math.round(avg * 10.0) / 10.0);
        r.setRatingCount(allRatings.size());
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
