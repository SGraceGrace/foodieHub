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
- [ ] Add `spring-boot-starter-data-redis-reactive` to api-gateway pom
- [ ] Configure `RequestRateLimiter` filter on routes in application.yaml
- [ ] Set different limits per route (stricter on `/api/orders`, looser on `/api/restaurants`)
- [ ] Return proper 429 with `Retry-After` header
