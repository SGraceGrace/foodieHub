# FoodieHub — System Design Audit

## ✅ Correctly Aligned

| Design Rule | Status | Notes |
|---|---|---|
| Service ports (8080–8084) | ✅ Correct | Gateway:8080, User:8081, Food:8082, Order:8083, Notification:8084 |
| RabbitMQ — `order.placed` event | ✅ Correct | `ORDER_PLACED_RKEY = "order.placed"` + `order.status.updated` bonus |
| RabbitMQ exchange | ✅ Correct | `foodiehub.exchange` TopicExchange in all services |
| Rating — separate `ratings` collection | ✅ Correct | `@Document(collection = "ratings")` in food-service |
| Rating — `@Indexed(unique = true)` on `orderId` | ✅ Correct | DB-level uniqueness enforced |
| Rating — avg recalculated from source | ✅ Correct | Fetches all ratings, computes average — no rolling estimate |
| Rating — `auto-index-creation: true` | ✅ Correct | Set in food-service `application.yaml` |
| Rating — auth via `X-User-Id` header | ✅ Correct | Gateway injects header, controller reads it |
| Notification — SSE layer (`SseEmitter`) | ✅ Correct | `SseEmitterService` present and wired |
| Notification — Web Push layer (VAPID) | ✅ Correct | `WebPushService` present and wired |
| Notification — SSE opened in header component | ✅ Correct | Customer SSE in `UserHeaderComponent`, Admin in `AdminHeaderComponent` |
| Notification — SSE aborted in `ngOnDestroy()` | ✅ Correct | `sseController?.abort()` called in `UserHeaderComponent.ngOnDestroy()` |
| Notification — `PushNotificationService.init()` + `permission$` | ✅ Correct | Used in `UserHeaderComponent` and `AdminHeaderComponent` |
| Notification — `sw.js` in `public/` | ✅ Correct | Present at `foodieHub-FE/public/sw.js` |
| `content ?? []` guard on all paginated responses | ✅ Correct | Used consistently across all components |
| Service interface + `impl` pattern | ✅ Correct | All 4 services follow this |
| Pagination — `@RequestParam page/size` + `PageRequest.of()` | ✅ Correct | food-service, order-service, user-service |
| MySQL for user-service | ✅ Correct | |
| MongoDB for food-service and order-service | ✅ Correct | |

---

## ❌ Issues Found

### 1. `new Notification()` used directly in `partner-workspace.component.ts`

**File:** `foodieHub-FE/src/app/partner/partner-workspace/partner-workspace.component.ts` — line 462

```typescript
// ❌ Violates CLAUDE.md — never use new Notification() in a component
new Notification('🛎 New Order!', {
  body: `${notif.customerName} placed an order • ₹${notif.totalAmount}`,
  icon: '/favicon.ico',
  tag: `order-${notif.orderId ?? Date.now()}`,
  requireInteraction: true,
});
```

**Why this is wrong:**
- CLAUDE.md states: _"Never use `new Notification()` directly in a component. Never skip the service worker."_
- `new Notification()` produces a basic browser notification — it looks different from a real OS notification, it doesn't work in all browser states, and it bypasses the service worker entirely.
- The `sw.js` service worker already handles push events for the whole app. The backend controls the payload.

**Fix:**
1. Remove `showBrowserNotification()` method from `partner-workspace.component.ts`
2. Ensure the restaurant partner's order notification is sent as a Web Push from `notification-service` via `WebPushService`
3. Add a `RestaurantPushSubscription` entity + repo in notification-service (if not already present)
4. Subscribe via `PushNotificationService` in the partner workspace (same pattern as customer/admin)

---

### 2. Redis key format does not follow the `session:{userId}` spec

**File:** `foodieHub/src/.../service/impl/AuthServiceImpl.java` — line 64

**Spec from CLAUDE.md:**
```
session:{userId}  →  JWT token  TTL: 24h
```

**Actual implementation:**
```java
// ❌ Concatenation without namespace prefix
redisTemplate.opsForValue().set(user.getUsername() + loginRequestDTO.getDeviceId(), token, Duration.ofMillis(jwtExpiration));
```

Same pattern repeated in `RefreshTokenServiceImpl.java`, `CustomOAuth2SuccessHandler.java`, and `JwtService.java`.

**Why this matters:**
- `usernamedevice123` is not namespaced — it can clash with other keys if Redis is shared
- The spec requires `session:{userId}` format for clarity and namespace isolation
- Keys like `session:grace@email.comdevice123` would be more correct and consistent

**Fix:**
```java
String redisKey = "session:" + user.getUsername() + ":" + deviceId;
redisTemplate.opsForValue().set(redisKey, token, Duration.ofMillis(jwtExpiration));
```
Update the key format consistently in `AuthServiceImpl`, `RefreshTokenServiceImpl`, `CustomOAuth2SuccessHandler`, and `JwtService`.

---

### 3. Cart stored in MongoDB instead of Redis

**File:** `order-service/src/.../document/Cart.java`

**Spec from CLAUDE.md:**
```
cart:{userId}  →  Cart items JSON  TTL: 2h
```

**Actual implementation:**
```java
// ❌ Cart is a MongoDB @Document — no Redis, no TTL
@Document(collection = "carts")
public class Cart { ... }
```

`CartServiceImpl` reads/writes directly to `CartRepository` (MongoDB). There is no Redis involved in cart storage and no TTL.

**Why this matters:**
- Carts in MongoDB are permanent unless explicitly cleared — no automatic expiry for abandoned carts
- CLAUDE.md specifies Redis TTL 2h for carts exactly because users abandon carts constantly
- A MongoDB cart also adds unnecessary write load for what should be temporary data

**Fix option A (correct):** Migrate cart to Redis using `StringRedisTemplate` with `cart:{userId}` key and 2-hour TTL. Serialize cart as JSON.

**Fix option B (acceptable for POC):** Keep MongoDB but add a TTL index on `updatedAt` field so MongoDB automatically expires abandoned carts after 2 hours:
```java
@Indexed(expireAfterSeconds = 7200)
private LocalDateTime updatedAt;
```

---

### 4. food-service has no Redis caching for restaurant list

**Spec from CLAUDE.md:**
```
cache:restaurants  →  Restaurant list  TTL: 10min
```

**Actual:** food-service has zero Redis usage. No `RedisTemplate`, no `@Cacheable`, no Redis config.

**Why this matters:**
- Restaurant listing is the highest-traffic endpoint in the app (every page load hits it)
- The cache is explicitly called out in CLAUDE.md as a portfolio talking point: _"Redis caching for restaurant list — good to show in interviews"_
- Without it, every request hits MongoDB directly

**Fix:** Add Spring Cache with Redis as the backing store in food-service:

1. Add `spring-boot-starter-data-redis` and `spring-boot-starter-cache` to `pom.xml`
2. Configure `RedisCacheConfig` with a TTL of 10 minutes
3. Annotate the service method:

```java
@Cacheable(value = "restaurants", key = "#cuisine + '-' + #page + '-' + #size")
public PaginatedResponse<Restaurant> getAll(...) { ... }

@CacheEvict(value = "restaurants", allEntries = true)
public Restaurant create(...) { ... }
```

---

## Summary

| Priority | Issue | Location |
|---|---|---|
| High | `new Notification()` used directly — violates notification architecture | `partner-workspace.component.ts:462` |
| Medium | Redis session key lacks `session:` namespace prefix | `AuthServiceImpl`, `RefreshTokenServiceImpl`, `JwtService`, `CustomOAuth2SuccessHandler` |
| Medium | Cart stored in MongoDB — should be Redis with TTL 2h | `CartServiceImpl`, `Cart.java` |
| Medium | food-service has no Redis caching for restaurant list | food-service (missing entirely) |
