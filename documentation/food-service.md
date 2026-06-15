# Food Service

**Port:** 8082  
**Database:** MongoDB (`foodiehub_food`)  
**Tech:** Spring Boot 3.x, Spring Data MongoDB, Spring Cache + Redis, Elasticsearch, Spring AMQP  
**File:** `backend/food-service`

---

## Responsibilities

- Restaurant CRUD (admin) and read-only browsing (public)
- Menu management (nested within restaurant documents)
- Geo-spatial queries — find restaurants near a location
- Elasticsearch full-text search across restaurants and menu items
- Redis caching of restaurant listing results (10-minute TTL)
- Restaurant ratings (one per order, recalculated from source of truth)
- Customer wishlist (saved restaurants)
- Hero slides for the home page carousel
- Receive `order.placed` events to increment menu item order counts

---

## MongoDB Schema

### Restaurant document

```json
{
  "_id": "ObjectId",
  "name": "Spice Garden",
  "address": "12 MG Road, Bengaluru",
  "ownerId": "owner@email.com",
  "fssaiNumber": "12345678901234",
  "gstNumber": "29ABCDE1234F1Z5",
  "imageUrl": "https://cdn.example.com/spice-garden.jpg",
  "cuisine": ["Indian", "Biryani"],
  "rating": 4.3,
  "ratingCount": 127,
  "deliveryTime": 30,
  "minOrder": 150,
  "priceRange": "₹₹",
  "status": "ACTIVE",
  "isOpen": true,
  "location": {
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "lat": 12.9716,
    "lng": 77.5946
  },
  "geoPoint": {
    "type": "Point",
    "coordinates": [77.5946, 12.9716]
  },
  "operatingHours": [
    { "day": "MONDAY", "open": true, "openTime": "09:00", "closeTime": "22:00" },
    { "day": "TUESDAY", "open": true, "openTime": "09:00", "closeTime": "22:00" }
  ],
  "menu": [
    {
      "category": "Main Course",
      "items": [
        {
          "id": "item-uuid",
          "name": "Butter Chicken",
          "description": "Creamy tomato-based curry",
          "price": 340.0,
          "isVeg": false,
          "available": true,
          "imageUrl": "...",
          "orderCount": 1823
        }
      ]
    }
  ],
  "distanceKm": null,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-06-10T00:00:00Z"
}
```

**Key design decisions:**

- `menu` is embedded inside the restaurant document (not a separate collection). Restaurant + full menu is always fetched together, which is the common access pattern. MongoDB handles documents up to 16 MB; even a 100-item menu is tiny.
- `geoPoint` stores coordinates in GeoJSON format (`{ type: "Point", coordinates: [lng, lat] }`). GeoJSON always puts **longitude first**, which is the opposite of most human conventions. The code explicitly comments this: `GeoJsonPoint(l.getLng(), l.getLat())`.
- `location` is a separate embedded object with string city/state fields for display. `geoPoint` is the indexed field for `$near` queries.
- `isOpen` is computed and stored on every save (`computeIsOpen()` checks `operatingHours` against the current IST time). It is not recalculated at query time — a background job (or next save) keeps it fresh.
- `auto-index-creation: true` in `application.yaml` ensures MongoDB creates the 2dsphere index on `geoPoint` automatically when the service starts.

### Rating document

```json
{
  "_id": "ObjectId",
  "restaurantId": "...",
  "customerId": "user@email.com",
  "orderId": "order123",
  "rating": 4.5,
  "driverEmail": "driver@email.com",
  "driverRating": 5,
  "createdAt": "2025-06-15T10:00:00Z"
}
```

`orderId` has a `@Indexed(unique = true)` annotation. This creates a MongoDB unique index that prevents duplicate ratings at the database level, even under concurrent requests. The service also does an application-level check (`ratingRepo.existsByOrderId(orderId)`) before saving, to give a friendly error message instead of a MongoDB duplicate key exception.

### Wishlist document

```json
{
  "_id": "ObjectId",
  "userId": "user@email.com",
  "restaurantId": "...",
  "createdAt": "2025-06-15T10:00:00Z"
}
```

---

## Restaurant Listing — Query Strategy

`GET /api/v1/restaurants` supports four query parameters:
- `cuisine` — filter by cuisine name (case-insensitive partial match)
- `lat` + `lng` — user's coordinates for geo-proximity sorting
- `radiusKm` — search radius (default 10 km)
- `sort` — `relevance`, `deliveryTime`, `priceLow`, `priceHigh`, `rating`

The service uses **different query paths** for geo and non-geo requests:

### Non-geo path (no lat/lng)

```java
restaurantRepo.findByStatus(RestaurantStatus.ACTIVE, sortedPageable)
// or with cuisine filter:
restaurantRepo.findByStatusAndCuisineContainingIgnoreCase(ACTIVE, cuisine, pageable)
```

Spring Data translates these to standard MongoDB queries. Sort is applied at the database level via `PageRequest.of(page, size, toSort(sort))`. This path is **cached in Redis** (see caching section).

### Geo path (lat/lng provided)

```java
NearQuery nearQuery = NearQuery
    .near(new Point(lng, lat), Metrics.KILOMETERS)
    .maxDistance(radius)
    .spherical(true)
    .query(Query.query(statusFilter));

List<GeoResult<Restaurant>> results = mongoTemplate.geoNear(nearQuery, Restaurant.class);
```

MongoDB's `$geoNear` aggregation stage does the radius filter at the database level and returns each document with its exact distance. The service maps the distance onto `restaurant.distanceKm` for display in the UI. In-memory sorting is then applied because `$near` results already come in distance order and re-sorting by another field requires in-memory work anyway.

**Why not cache geo queries?** Geo queries are parameterized by the user's exact coordinates — `12.9716_77.5946_2.0` is a different cache key from `12.9717_77.5946_2.0`. The key space is effectively infinite and cache hit rates would be near zero, so geo results are never cached.

---

## Redis Caching

**Configuration:** `CacheConfig.java` defines a `RedisCacheManager` with:
- Restaurants cache: 10-minute TTL
- Default cache: 5-minute TTL
- Serialization: `GenericJackson2JsonRedisSerializer` (stores type info in JSON for safe deserialization)

**Cache key:** `cuisine + '_' + sort + '_' + pageNumber + '_' + pageSize`

```java
@Cacheable(
  value = "restaurants",
  key = "#cuisine + '_' + #sort + '_' + #pageable.pageNumber + '_' + #pageable.pageSize",
  condition = "#lat == null && #lng == null"
)
public PaginatedResponse<Restaurant> getAll(...) { ... }
```

The `condition` ensures geo queries bypass the cache entirely.

**Cache eviction:** Any write to the restaurant collection clears all cached entries:

```java
@CacheEvict(value = "restaurants", allEntries = true)
public Restaurant create(RestaurantCreateRequestDTO req) { ... }

@CacheEvict(value = "restaurants", allEntries = true)
public Restaurant updateHours(String id, List<DaySchedule> hours) { ... }

@CacheEvict(value = "restaurants", allEntries = true)
public Restaurant updateDetails(String id, RestaurantUpdateRequestDTO req) { ... }
```

`allEntries = true` is used instead of a targeted key because a restaurant update could affect multiple cached pages (a restaurant on page 2 could move to page 1 after a sort update).

---

## Elasticsearch Integration

All restaurant creates and updates call `searchService.indexRestaurant(saved)` to keep the Elasticsearch index in sync with MongoDB. This is a synchronous call — if ES is down, the save still succeeds but the search index may lag.

The search endpoint `GET /api/search?q=biryani` queries Elasticsearch for:
- Restaurant names
- Cuisine tags
- Menu item names

Results are returned in relevance order from ES. The full restaurant document is fetched from MongoDB by ID after the ES query (ES stores only the indexed fields, not the full document).

---

## Rating Flow

```
Customer clicks ★ on Orders page
  │
  ▼
Angular: forkJoin([
    POST /api/v1/restaurants/{restaurantId}/rating  { rating, orderId, driverEmail, driverRating }
    PATCH /api/orders/{orderId}/rated               { driverRating }
])
  │
  ▼
food-service RatingController:
  1. existsByOrderId(orderId) → 409 if already rated
  2. Save Rating document { restaurantId, customerId, orderId, rating, driverEmail, driverRating }
  3. Fetch ALL ratings for this restaurant
  4. avg = sum(ratings) / count  →  round to 1 decimal
  5. restaurant.rating = avg; restaurant.ratingCount = count
  6. Save restaurant
  7. searchService.indexRestaurant(saved)  →  sync ES
```

**Why recalculate from all ratings (not a rolling average)?**

A rolling average drifts if ratings are edited or deleted. Recalculating from the source of truth is more accurate. For a restaurant with up to a few thousand ratings, the `findByRestaurantId` query is fast (it hits a MongoDB index on `restaurantId`) and the in-memory average of a few thousand numbers is negligible CPU.

The `X-User-Id` header (injected by the gateway) is used as the `customerId` — the customer cannot fake their identity.

---

## Operating Hours — `computeIsOpen()`

```java
public static boolean computeIsOpen(Restaurant r) {
    ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"));
    String today = now.getDayOfWeek().name();  // "MONDAY"
    LocalTime current = now.toLocalTime();

    return r.getOperatingHours().stream()
            .filter(h -> today.equalsIgnoreCase(h.getDay()) && h.isOpen())
            .findFirst()
            .map(h -> {
                LocalTime open  = LocalTime.parse(h.getOpenTime());
                LocalTime close = LocalTime.parse(h.getCloseTime());
                return !current.isBefore(open) && current.isBefore(close);
            })
            .orElse(false);
}
```

The timezone is hardcoded to IST (`Asia/Kolkata`). All restaurant hours are stored in IST. This is a deliberate simplification — FoodieHub currently targets India only.

---

## API Reference

### Public (no auth required for GET)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/restaurants` | List restaurants (filters: cuisine, lat, lng, radiusKm, sort, page, size) |
| GET | `/api/v1/restaurants/{id}` | Single restaurant with full menu |
| GET | `/api/cuisines` | Distinct cuisine list (derived from all restaurant documents) |
| GET | `/api/search?q=...` | Full-text search via Elasticsearch |
| GET | `/api/v1/slides` | Active hero slides for home page carousel |

### Customer (requires JWT, role: END_USERS)

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/restaurants/{id}/rating` | Submit a rating for an order |
| GET | `/api/v1/wishlist` | Get own wishlist |
| POST | `/api/v1/wishlist/{restaurantId}` | Add restaurant to wishlist |
| DELETE | `/api/v1/wishlist/{restaurantId}` | Remove from wishlist |

### Restaurant owner (requires JWT, role: RESTAURANT_OWNER)

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/restaurants` | Create new restaurant |
| GET | `/api/v1/restaurants/my` | Own restaurants (by ownerId from X-User-Id header) |
| PUT | `/api/v1/restaurants/{id}/hours` | Update operating hours |
| PUT | `/api/v1/restaurants/{id}/details` | Update name, address, cuisine, images, etc. |
| POST | `/api/v1/restaurants/{id}/menu/category` | Add menu category |
| POST | `/api/v1/restaurants/{id}/menu/{categoryId}/items` | Add menu item |
| PUT | `/api/v1/restaurants/{id}/menu/items/{itemId}` | Update menu item |
| DELETE | `/api/v1/restaurants/{id}/menu/items/{itemId}` | Delete menu item |
| PATCH | `/api/v1/restaurants/{id}/menu/items/{itemId}/availability` | Toggle item availability |

### Admin

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/admin/restaurants` | All restaurants with status/cuisine filter |
| PUT | `/api/v1/admin/restaurants/{id}/status` | Approve/activate/suspend restaurant |
| POST | `/api/v1/admin/slides` | Create hero slide |
| PUT | `/api/v1/admin/slides/{id}` | Update slide |
| DELETE | `/api/v1/admin/slides/{id}` | Delete slide |
| PATCH | `/api/v1/admin/slides/{id}/toggle` | Toggle slide active/inactive |
