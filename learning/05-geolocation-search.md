# Geolocation Search

## What is it?
Querying data based on physical distance — "show me restaurants within 5 km of my location". Used by every food delivery and ride-hailing app.

## The bug we fixed
The original implementation fetched a page of 10 restaurants, then filtered by distance in Java:
```java
// WRONG — fetches page 1 (10 restaurants), then filters → might return only 3
List<Restaurant> candidates = restaurantRepo.findByStatus(ACTIVE, pageable).getContent();
List<Restaurant> nearby = candidates.stream()
    .filter(r -> haversineKm(...) <= radius)
    .collect(Collectors.toList());
```
If you ask for 10 restaurants and only 3 of that page's 10 are nearby, you get 3 back — broken pagination.

Fix: let MongoDB filter by distance **before** pagination using `$near`.

## How it works now

```
User selects delivery address (lat=13.0827, lng=80.2707)
    ↓
Angular calls GET /api/v1/restaurants?lat=13.0827&lng=80.2707&radiusKm=10
    ↓
food-service: NearQuery.near([80.2707, 13.0827], KILOMETERS).maxDistance(10)
    ↓
MongoDB finds ALL restaurants within 10km, sorted by distance
    ↓
Service sets distanceKm on each result → paginate → return
    ↓
Angular shows "📍 2.3km" badge on each restaurant card
```

## MongoDB data model

### Restaurant document
```java
// GeoJSON Point — lng FIRST (GeoJSON convention, not lat/lng)
@GeoSpatialIndexed(type = GeoSpatialIndexType.GEO_2DSPHERE)
private GeoJsonPoint geoPoint;   // stored in MongoDB

@Transient
private Double distanceKm;       // NOT stored — populated by geo query response
```

### What MongoDB stores
```json
{
  "name": "Spice Garden",
  "geoPoint": {
    "type": "Point",
    "coordinates": [80.2707, 13.0827]   // [longitude, latitude] — lng first!
  }
}
```

The `2dsphere` index tells MongoDB this is spherical geometry — distances are accurate across the globe, not flat-earth math.

## The NearQuery (food-service)

```java
NearQuery nearQuery = NearQuery
    .near(new Point(lng, lat), Metrics.KILOMETERS)  // lng first
    .maxDistance(radius)                             // 10km default
    .spherical(true)
    .query(Query.query(Criteria.where("status").is(ACTIVE)));

List<Restaurant> nearby = mongoTemplate.geoNear(nearQuery, Restaurant.class)
    .getContent().stream()
    .map(gr -> {
        Restaurant r = gr.getContent();
        r.setDistanceKm(Math.round(gr.getDistance().getValue() * 10.0) / 10.0); // e.g. 2.3
        return r;
    })
    .collect(Collectors.toList());
```

`GeoResult<Restaurant>` carries both the document AND the calculated distance — no Java math needed.

## Setting geoPoint when a restaurant is saved

```java
// In create() and updateDetails() — set geoPoint from location.lat/lng
if (l.getLat() != null && l.getLng() != null) {
    restaurant.setGeoPoint(new GeoJsonPoint(l.getLng(), l.getLat())); // lng first
}
```

Existing restaurants without `geoPoint` won't appear in geo queries until they're updated with coordinates.

## Angular — delivery address drives the query

```typescript
// HomeComponent — deliveryAddressService gives lat/lng from the saved address
this.deliveryAddressService.selected$.subscribe(addr => {
    this.userLat = addr?.location?.lat;
    this.userLng = addr?.location?.lng;
    this.loadRestaurants();
});

loadRestaurants(cuisine?: string) {
    this.homeService.getRestaurants(cuisine, this.userLat, this.userLng).subscribe(...);
}
```

No `navigator.geolocation` needed — the user's saved delivery address already has coordinates.

## Distance badge (already in the HTML)
```html
<span class="rest-badge-dist" *ngIf="getDistanceLabel(r)">
  📍 {{ getDistanceLabel(r) }}
</span>
```
```typescript
getDistanceLabel(r: Restaurant): string {
    if (r.distanceKm == null) return '';
    return r.distanceKm < 1
        ? `${Math.round(r.distanceKm * 1000)}m`   // "800m"
        : `${r.distanceKm.toFixed(1)}km`;           // "2.3km"
}
```

## The GeoJSON longitude-first gotcha
GeoJSON always uses `[longitude, latitude]` — the opposite of what most people expect.
```java
new GeoJsonPoint(80.2707, 13.0827)  // ✅ (lng, lat)
new GeoJsonPoint(13.0827, 80.2707)  // ❌ (lat, lng) — wrong, Chennai ends up in the ocean
```
This is the #1 mistake with geo queries — worth mentioning in interviews.

## Interview talking points
- "I store restaurant location as a GeoJSON Point and use MongoDB's `2dsphere` index. `$near` queries let MongoDB do the radius filter efficiently — much better than fetching all restaurants and filtering in Java"
- "GeoJSON uses `[longitude, latitude]` order — opposite of what you'd expect. I got burned by this and it's a well-known gotcha"
- "The `distanceKm` field is `@Transient` — it's calculated by the geo query and sent to the client but never stored in MongoDB"
- "The distance comes back in the `GeoResult` wrapper alongside the document — no haversine formula needed in Java"
- "For very large datasets, geohashing (S2 geometry, like Uber uses) is more scalable than pure radius queries"
