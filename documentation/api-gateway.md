# API Gateway

**Port:** 8080  
**Tech:** Spring Cloud Gateway MVC (servlet-based, not reactive)  
**File:** `backend/api-gateway`

---

## Why Spring Cloud Gateway MVC (not reactive)?

Spring Cloud Gateway comes in two flavours: reactive (WebFlux) and MVC (servlet-based). FoodieHub uses the MVC variant because:

- SSE (`SseEmitter`) is a blocking, servlet API. Reactive WebFlux uses `Flux<ServerSentEvent>` instead.
- The MVC gateway can proxy long-lived SSE connections from the Angular frontend all the way to notification-service without adapter shims.
- All other services in the stack are also servlet-based (Spring MVC), so consistency avoids thread-model surprises.

---

## Filter Pipeline

Every HTTP request passes through three global filters, in this order:

```
Request
  │
  ▼
RateLimitFilter       — Check Redis counter; block if over limit
  │
  ▼
JwtAuthFilter         — Validate JWT; inject X-User-Id + X-User-Role
  │
  ▼
SseAcceptHeaderFilter — Patch Accept header for SSE routes
  │
  ▼
Spring Cloud Gateway routing → upstream service
```

---

## JWT Validation (`JwtAuthFilter`)

The gateway is the **single auth enforcement point** for the entire system. Downstream services trust the headers the gateway injects; they do not re-validate the JWT signature.

### Public paths

Some paths are always public regardless of HTTP method (no token required):

```
/api/v1/auth/login
/api/v1/auth/signup
/api/v1/auth/logout
/api/v1/refresh-token
/api/v1/contact
/api/v1/slides
/api/v1/partner/register
/api/v1/driver/register
/login/oauth2/**
/oauth2/**
/actuator/**
/api/v1/coupons/active
```

Some paths are public for **GET only** — POST/PUT/DELETE require auth:

```
/api/v1/restaurants/**   GET: browse restaurants (no login)
                         POST: create rating (login required)
/api/search/**           GET: search (no login)
```

This split is implemented in `GET_PUBLIC_PATHS` in `JwtAuthFilter`:

```java
private static final List<String> GET_PUBLIC_PATHS = List.of(
    "/api/v1/restaurants",
    "/api/search"
);
```

### JWT parsing

The filter reads the `Authorization: Bearer <token>` header, extracts the JJWT `Claims`, and injects two custom headers:

```
X-User-Id:   <subject field from JWT — the user's email>
X-User-Role: {authority=ROLE_END_USERS}  (toString of the first GrantedAuthority)
```

**Why does `X-User-Role` look like `{authority=ROLE_END_USERS}`?**

The JWT `role` claim is serialized as a JSON array of objects (Spring Security's `GrantedAuthority` serialization):

```json
"role": [{"authority": "ROLE_END_USERS"}]
```

The gateway reads it as `List<?>` and calls `.toString()` on the first element, producing `{authority=ROLE_END_USERS}`. Downstream services' `HeaderAuthFilter` parses the string by extracting the substring between `=` and `}` to get the clean role name `ROLE_END_USERS`.

### Optional JWT on public paths

When a public-path request arrives with a valid JWT, the gateway still injects the headers. This lets downstream controllers (like `RestaurantController`) handle both anonymous and authenticated users on the same endpoint — e.g., to personalize results or protect POST sub-paths within the same controller.

If the JWT is absent or malformed on a public path, the request passes through with no headers (anonymous access).

### 401 response with CORS headers

When the gateway rejects a request (missing or invalid JWT), it writes a 401 with CORS headers included:

```json
{"status": 401, "error": "Missing or invalid Authorization header"}
```

The CORS headers are required here because without them, Angular receives `status: 0` instead of `status: 401`, and the refresh-token interceptor never fires.

---

## Rate Limiting (`RateLimitFilter`)

All requests (authenticated or not) are rate-limited by client IP. The limiter is implemented with Redis using a sliding-window counter:

- **Window:** 1 minute
- **Limit:** 100 requests per IP per window
- **Key pattern:** `ratelimit:{ip}:{epochMinute}`
- **Response on breach:** `429 Too Many Requests` with `Retry-After: 60` header

The Redis key has a TTL of 2 minutes to self-clean. Because Redis is the backing store (not in-memory), the limit applies across all gateway restarts and multiple gateway replicas.

---

## SSE Support (`SseAcceptHeaderFilter`)

SSE connections require the request to carry `Accept: text/event-stream`. Some proxies and Angular's `EventSource` client strip or omit this header. The `SseAcceptHeaderFilter` patches it back in for the notification-service SSE routes:

```
/api/v1/admin/notifications/stream
/api/v1/customer/notifications/stream
/api/v1/restaurant/notifications/stream/{restaurantId}
/api/v1/driver/notifications/stream
```

Without this filter, the servlet container would not recognise the response as an SSE stream and might buffer or close it prematurely.

---

## Routing

All routes are defined in `api-gateway/src/main/resources/application.yaml`. Each route maps a URL predicate to an upstream service URL, with an attached circuit breaker.

### Route table (abridged)

| Route ID | Predicate | Upstream |
|---|---|---|
| `user-service-auth` | `/api/v1/auth/**` | user-service:8081 |
| `user-service-users` | `/api/v1/user`, `/api/v1/user/**` | user-service:8081 |
| `user-service-refresh` | `/api/v1/refresh-token/**` | user-service:8081 |
| `user-service-oauth2` | `/oauth2/**`, `/login/oauth2/**` | user-service:8081 |
| `user-service-partner` | `/api/v1/partner/**` | user-service:8081 |
| `user-service-driver-register` | `/api/v1/driver/**` | user-service:8081 |
| `user-service-admin-users` | `/api/v1/admin/users/**` | user-service:8081 |
| `user-service-admin-contact-messages` | `/api/v1/admin/contact-messages/**` | user-service:8081 |
| `user-service-activity-logs` | `/api/v1/admin/activity-logs` | user-service:8081 |
| `user-service-restaurant-owners` | `/api/v1/admin/restaurant-owners/**` | user-service:8081 |
| `user-service-drivers` | `/api/v1/admin/drivers/**` | user-service:8081 |
| `food-service-restaurants` | `/api/v1/restaurants`, `/api/v1/restaurants/**` | food-service:8082 |
| `food-service-cuisines` | `/api/cuisines/**` | food-service:8082 |
| `food-service-search` | `/api/search/**` | food-service:8082 |
| `food-service-wishlist` | `/api/v1/wishlist/**` | food-service:8082 |
| `food-service-ratings` | `/api/v1/ratings/**` | food-service:8082 |
| `food-service-slides-public` | `/api/v1/slides` | food-service:8082 |
| `food-service-slides-admin` | `/api/v1/admin/slides/**` | food-service:8082 |
| `food-service-admin-restaurants` | `/api/v1/admin/restaurants/**` | food-service:8082 |
| `order-service-cart` | `/api/cart/**` | order-service:8083 |
| `order-service-orders` | `/api/orders/**` | order-service:8083 |
| `order-service-payments` | `/api/v1/payments/**` | order-service:8083 |
| `order-service-coupons` | `/api/v1/coupons/**`, `/api/v1/admin/coupons/**` | order-service:8083 |
| `notification-service-notifications` | `/api/v1/admin/notifications/**` | notification-service:8084 |
| `notification-service-push-subscription` | `/api/v1/admin/push-subscription` | notification-service:8084 |
| `notification-service-restaurant` | `/api/v1/restaurant/notifications/**` | notification-service:8084 |
| `notification-service-customer-sse` | `/api/v1/customer/notifications/stream` | notification-service:8084 |
| `notification-service-customer` | `/api/v1/customer/notifications/**`, `/api/v1/customer/push-subscription` | notification-service:8084 |
| `notification-service-driver-notifications` | `/api/v1/driver/notifications/**` | notification-service:8084 |

> **Note on path versioning:** Cart and orders use `/api/cart/**` and `/api/orders/**` (no `/v1/`). Auth, restaurants, and notifications use `/api/v1/...`. This is a historical inconsistency in the codebase; both patterns work.

---

## Circuit Breakers (Resilience4j)

Every route has a named circuit breaker. When a service is down, the circuit breaker opens and the gateway routes to a fallback endpoint (`/fallback/{service-name}`) which returns a structured 503 response instead of hanging.

### Circuit breaker instances

| Instance | Failure threshold | Open state wait | Window size | Notes |
|---|---|---|---|---|
| `user-service` | 50% | 10s | 10 calls | Standard |
| `food-service` | 50% | 10s | 10 calls | Standard |
| `order-service` | 50% | 10s | 10 calls | Standard |
| `notification-service` | 50% | 10s | 10 calls | Standard |
| `notification-service-sse` | **100%** | **30s** | 10 calls | SSE-specific: SSE connections close normally on tab close; this must not be counted as a failure |
| `user-service-oauth2` | **80%** | **5s** | 5 calls | OAuth2 routes open more quickly; fast recovery so the login redirect does not get stuck |

The SSE circuit breaker uses 100% failure threshold because `SseEmitter` closes with a completion event when the browser tab is closed. Without this override, every tab-close increments the failure counter and eventually opens the circuit, causing 503 for the next user who opens the page.

OAuth2 routes get their own named circuit breaker (`user-service-oauth2`) so that OAuth2 failures do not trip the API circuit breaker that covers login and profile endpoints.

---

## CORS (`CorsConfig`)

CORS is configured globally on the gateway. Downstream services do not need their own CORS configuration.

```java
allowedOriginPatterns: ["*"]  // Tightened to specific origins in production
allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
allowedHeaders: ["*"]
allowCredentials: true
maxAge: 3600
```

`allowCredentials: true` is required for the Angular app to send cookies and the `Authorization` header cross-origin.

---

## Fallback Controller

`FallbackController` handles all `/fallback/{service}` routes. It returns a consistent JSON shape:

```json
{
  "status": 503,
  "error": "Service temporarily unavailable. Please try again later."
}
```

This is what the Angular error interceptor receives when a service is down or the circuit is open.
