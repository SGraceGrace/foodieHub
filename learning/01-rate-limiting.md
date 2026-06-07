# Rate Limiting

## What is it?
Controlling how many requests a user/IP can make in a given time window. Requests over the limit get rejected with HTTP 429 Too Many Requests.

## Why it matters
Without rate limiting, a single bad actor can flood your API and bring it down for everyone. Every production API has this.

## How it works in FoodieHub
```
User → API Gateway → Rate Limiter (Redis) → Microservice
                          ↓
                  If limit exceeded → 429
```

Redis stores a counter per user per minute:
- Key: `rate:{userId}` or `rate:{ip}`
- Value: request count
- TTL: 60 seconds (auto-resets each minute)

## Implementation in Spring Cloud Gateway
Spring Cloud Gateway has a built-in `RequestRateLimiter` filter — uses Redis under the hood (you already have Redis running).

```yaml
# api-gateway application.yaml
filters:
  - name: RequestRateLimiter
    args:
      redis-rate-limiter.replenishRate: 10    # 10 requests/sec steady state
      redis-rate-limiter.burstCapacity: 20    # allow burst up to 20
      redis-rate-limiter.requestedTokens: 1
```

## Common strategies
| Strategy | How | Use case |
|---|---|---|
| Fixed Window | count per minute, resets at :00 | Simple, good enough for most |
| Sliding Window | rolling 60-second window | More accurate, no burst at window boundary |
| Token Bucket | tokens refill at fixed rate, each request spends one | Allows bursts, used by AWS/Stripe |
| Leaky Bucket | requests drain at fixed rate regardless of burst | Smooth output rate |

Spring Gateway's built-in uses **Token Bucket**.

## Interview talking points
- "I added rate limiting at the API Gateway so it applies to all services in one place — no need to implement it in each microservice"
- "I used Token Bucket via Spring Cloud Gateway's RequestRateLimiter which stores counters in Redis — Redis is already in our stack for cart and sessions"
- "Different limits for different routes — search gets 30 req/min, order placement gets 5 req/min to prevent accidental duplicate orders"

## What to implement in FoodieHub
- [x] Per-route limits (stricter on `/api/orders`, looser on `/api/search`)
- [x] Return 429 with `Retry-After` header
- [x] `X-RateLimit-Remaining` header on every response

## What was actually built (better than the plan)

Instead of Spring Gateway's built-in `RequestRateLimiter`, a custom `RateLimitFilter` was implemented using a **Lua script executed atomically in Redis**.

### Why custom instead of built-in
Spring Gateway's `RequestRateLimiter` requires the reactive stack (`WebFlux`). FoodieHub's gateway uses the MVC (servlet) stack — the built-in filter isn't compatible. The custom filter runs as a servlet `Filter` with `@Order(1)`.

### Per-user keying (smarter than per-IP)
```java
// Authenticated request → rate limit by userId (per-user precision)
"user:" + claims.getSubject()

// Public route → fall back to IP
"ip:" + request.getRemoteAddr()
```
Per-IP limits are easy to bypass (multiple tabs, VPN). Per-user limits actually track the individual — once you're logged in, you can't escape by switching IPs.

### Token Bucket via atomic Lua script
The entire read-modify-write (refill tokens based on elapsed time → consume one → write back) runs as a single Lua script. Redis executes Lua atomically — no two concurrent requests can race on the same bucket key.

```
Redis key:  rate:{userId}:{route}
Fields:     tokens (float), ts (Unix ms)
TTL:        120s (auto-expires idle buckets)
```

### Route limits in place
| Route | Limit | Burst |
|---|---|---|
| `/api/v1/auth` | 10 req/min | 10 |
| `/api/orders` | 5 req/min | 5 |
| `/api/cart` | 20 req/min | 20 |
| `/api/search` | 30 req/min | 30 |
| `/api/v1/restaurants` | 30 req/min | 30 |
| everything else | 60 req/min | 60 |

### CORS on 429 responses
Without this, Angular sees a status-0 network error instead of a real 429 — the browser blocks the response because CORS headers are missing. The filter explicitly adds `Access-Control-Allow-Origin` on every error response.

## Interview talking points (updated)
- "I implemented a custom Token Bucket rate limiter as a servlet filter rather than using Spring Gateway's built-in — the built-in requires WebFlux and this gateway uses the MVC stack"
- "The token bucket algorithm runs as an atomic Lua script in Redis — read, refill, consume, write all happen in one operation so there's no race condition even under concurrent requests"
- "I rate limit by userId from the JWT for authenticated routes, and fall back to IP for public routes — per-IP limits are trivially bypassed, per-user limits actually mean something"
- "Orders get 5 req/min, search gets 30 req/min — different limits for different sensitivity. You don't want someone hammering the order endpoint"
