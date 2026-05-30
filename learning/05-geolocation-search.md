# Geolocation Search

## What is it?
Querying data based on physical distance — "show me restaurants within 5 km of my location". Used by every food delivery and ride-hailing app.

## How it works in FoodieHub
Store each restaurant's GPS coordinates. When user searches, send their lat/lng, query for restaurants within a radius.

```
User location: { lat: 13.0827, lng: 80.2707 }  (Chennai)
Query: find all restaurants within 5km of this point
```

## Two options: MongoDB $near vs Elasticsearch geo_distance

### Option A — MongoDB $near (simpler, already in your stack)
Store `location` as a GeoJSON point on the Restaurant document:
```json
{
  "name": "Spice Garden",
  "location": {
    "type": "Point",
    "coordinates": [80.2707, 13.0827]   // [longitude, latitude] — note: lng first in GeoJSON
  }
}
```

Create a 2dsphere index:
```java
@GeoSpatialIndexed(type = GeoSpatialIndexType.GEO_2DSPHERE)
private GeoJsonPoint location;
```

Query:
```java
// Restaurants within 5km
NearQuery query = NearQuery.near(new Point(userLng, userLat), Metrics.KILOMETERS)
    .maxDistance(5);
GeoResults<Restaurant> results = mongoTemplate.geoNear(query, Restaurant.class);
```

### Option B — Elasticsearch geo_distance (consistent with existing search)
Add `location` field to `RestaurantSearchDoc`:
```java
@GeoPointField
private String location;  // "lat,lng" format
```

Query with distance filter:
```java
NativeQuery query = NativeQuery.builder()
    .withQuery(q -> q
        .geoDistance(g -> g
            .field("location")
            .location(l -> l.latlon(ll -> ll.lat(userLat).lon(userLng)))
            .distance("5km")
        )
    )
    .build();
```

## Recommended: MongoDB $near for location filtering, ES for text search
Use both together — filter by distance in MongoDB, search by name/cuisine in ES.

## API design
```
GET /api/restaurants?lat=13.0827&lng=80.2707&radius=5
```

## Interview talking points
- "Restaurant location is stored as a GeoJSON Point. MongoDB's 2dsphere index lets us do efficient radius queries — it uses a spherical geometry model so distances are accurate even at scale"
- "GeoJSON uses [longitude, latitude] order (not lat/lng) — this is a common gotcha"
- "For very large datasets, geohashing (dividing Earth into a grid of cells) is more scalable than pure radius queries — Uber uses S2 geometry for this"

## What to implement in FoodieHub
- [ ] Add `GeoJsonPoint location` field to Restaurant document
- [ ] Add `@GeoSpatialIndexed(type = GEO_2DSPHERE)` annotation
- [ ] Seed lat/lng for existing restaurants (pick real Chennai/Mumbai coordinates)
- [ ] Add `lat`, `lng`, `radius` params to restaurant listing API
- [ ] Update Angular to request user's geolocation (`navigator.geolocation`) and send with requests
- [ ] Show distance badge on restaurant cards ("2.3 km away")
