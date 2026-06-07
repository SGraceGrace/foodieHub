# API Versioning

## What is it?
A strategy for evolving APIs without breaking existing clients. Once an API is live and clients depend on it, you can't just change the response shape — you need a versioning contract.

## Why it matters
```
V1 response:
  { "name": "Spice Garden", "rating": 4.8 }

You want to change to:
  { "name": "Spice Garden", "rating": { "score": 4.8, "count": 230 } }

Without versioning → existing Angular app breaks (expects rating as a number)
With versioning    → V1 clients still get the old shape, V2 clients get the new one
```

## Versioning strategies

### 1. URL path versioning — what FoodieHub uses
```
GET /api/v1/restaurants
GET /api/v2/restaurants   ← new shape
```
Most common. Easy to see in logs, easy to route at the gateway level.

**Pros:** Explicit, cacheable, easy to test in a browser
**Cons:** URL proliferation, clients must update base URL

---

### 2. Header versioning
```
GET /api/restaurants
Accept: application/vnd.foodiehub.v2+json
```
or
```
GET /api/restaurants
X-API-Version: 2
```

**Pros:** Clean URLs
**Cons:** Invisible in browser, harder to cache, harder to test without tools

---

### 3. Query parameter versioning
```
GET /api/restaurants?version=2
```

**Pros:** Easy to test
**Cons:** Easy to forget, pollutes query params, breaks caching

---

### 4. No versioning — just backward-compatible changes
Only add fields, never remove or rename. Existing clients ignore unknown fields.

```json
// V1 client reads:   { "rating": 4.8, "ratingCount": 230 }  → sees rating, ignores ratingCount
// V2 client reads:   { "rating": 4.8, "ratingCount": 230 }  → reads both
```

**Pros:** No version management overhead
**Cons:** You can never remove deprecated fields — API grows forever

---

## How FoodieHub is versioned
All routes already use `/api/v1/`. This is the URL path strategy. It was the right call from the start — adding versioning later is painful.

```
/api/v1/restaurants    → food-service
/api/v1/auth/**        → user-service
/api/orders/**         → order-service  ← note: no version prefix here
/api/cart/**           → order-service  ← note: no version prefix here
```

The order-service routes (`/api/orders`, `/api/cart`) are missing the `/v1/` prefix — inconsistency to fix before production.

## When to introduce V2 — the rule
**Never break V1.** Introduce V2 only when:
- You need to remove or rename a field
- The response shape fundamentally changes
- A breaking change is unavoidable

Additions (new fields, new optional params) don't need a new version — existing clients ignore what they don't know about.

## Gateway-level routing by version
Spring Cloud Gateway makes version routing clean:

```yaml
- id: food-service-v1
  uri: http://localhost:8082
  predicates:
    - Path=/api/v1/restaurants/**
  filters:
    - StripPrefix=2    # strips /api/v1 before forwarding

- id: food-service-v2
  uri: http://localhost:8082
  predicates:
    - Path=/api/v2/restaurants/**
  filters:
    - StripPrefix=2
    - AddRequestHeader=X-API-Version, 2   # service knows which version
```

The food-service controller handles both:
```java
@GetMapping("/restaurants")
public ResponseEntity<?> list(@RequestHeader(value = "X-API-Version", defaultValue = "1") int version) {
    if (version == 2) return ResponseEntity.ok(mapToV2(service.list()));
    return ResponseEntity.ok(service.list());
}
```

## Deprecation lifecycle
```
Month 1:  V2 released. V1 still supported.
Month 3:  V1 marked deprecated — add Deprecation header to V1 responses.
Month 6:  V1 sunset — returns 410 Gone.
```

```java
// Mark V1 as deprecated in the response header
response.setHeader("Deprecation", "true");
response.setHeader("Sunset", "Sat, 01 Jun 2026 00:00:00 GMT");
response.setHeader("Link", "</api/v2/restaurants>; rel=\"successor-version\"");
```

## Interview talking points
- "FoodieHub uses URL path versioning — `/api/v1/` prefix on all routes. It's the most explicit strategy: visible in logs, easy to route at the gateway, easy to test"
- "My rule is: additions don't need a new version. If I add a `ratingCount` field, existing clients just ignore it. I only bump to V2 when I need to remove or rename something — a genuinely breaking change"
- "The api-gateway makes version routing clean — V1 and V2 routes can point to the same service, which reads an `X-API-Version` header injected by the gateway and returns the appropriate shape"
- "I'd follow a deprecation lifecycle: announce V2, mark V1 deprecated with a `Sunset` header so clients know the date, then sunset V1 after 6 months"

## What to implement in FoodieHub
- [ ] Add `/v1/` prefix to order-service routes (`/api/orders` → `/api/v1/orders`, `/api/cart` → `/api/v1/cart`) for consistency — update api-gateway routes + Angular service URLs
- [ ] No V2 needed now — no breaking changes planned
- [ ] For the interview: be ready to explain when you'd introduce V2 and how the gateway would route it
