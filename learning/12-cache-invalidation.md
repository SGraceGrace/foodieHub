# Cache Invalidation

## What is it?
The strategy for keeping a cache consistent with the source of truth (the database). Stale cache data is one of the most common production bugs.

> "There are only two hard things in computer science: cache invalidation and naming things." — Phil Karlton

## The problem
```
1. Cache: { restaurants: [...old data...] }
2. Admin updates restaurant name in MongoDB
3. User fetches restaurants → gets old name from cache
4. How long until the cache reflects reality?
```

## Strategies

### 1. TTL (Time To Live) — what FoodieHub uses
Cache expires automatically after a set time. Simple, no extra logic needed.

```
cache:restaurants → TTL: 10 min
→ stale for up to 10 minutes after a DB update
→ auto-refreshes on next request after expiry
```

**When to use:** Read-heavy data that can tolerate slight staleness. Restaurant listings, menu data, cuisine categories.

**Trade-off:** Data can be stale for the full TTL duration. A restaurant that closes at 10pm might still show as "open" until the cache expires.

---

### 2. Write-Through
Update cache and DB simultaneously on every write. Cache is always in sync.

```
Admin updates restaurant →
  1. Write to MongoDB
  2. Write to Redis cache (same request)
  3. Future reads hit cache — always fresh
```

**When to use:** Data that must be immediately consistent — user profile, cart, session.

**Trade-off:** Every write hits both DB and cache. Slower writes. Cache may hold data that's never read (wasteful).

---

### 3. Write-Behind (Write-Back)
Write to cache first, DB later (asynchronously).

```
User adds to cart →
  1. Write to Redis immediately (fast response to user)
  2. Background job flushes to MongoDB every few seconds
```

**When to use:** High write throughput where eventual DB consistency is acceptable.

**Trade-off:** If cache goes down before flush, data is lost. Complex to implement safely.

---

### 4. Cache-Aside (Lazy Loading) — most common pattern
Application manages the cache manually. Cache is only populated on a cache miss.

```
Read request:
  1. Check Redis → miss
  2. Read from MongoDB
  3. Write result to Redis (with TTL)
  4. Return data

Next read → cache hit → skip MongoDB
```

**When to use:** General purpose. Most Spring Boot apps use this.

**Trade-off:** First request after expiry always hits the DB (cache miss penalty). Under high load, many simultaneous misses can flood the DB — the "thundering herd" problem.

---

### 5. Event-Driven Invalidation
When DB changes, publish an event → cache listener deletes or updates the cache key.

```
Admin updates restaurant → MongoDB write
  → publishes restaurant.updated event → RabbitMQ
    → food-service listener deletes cache key
      → next request repopulates cache fresh
```

**When to use:** When TTL staleness is unacceptable but you don't want write-through overhead on every request.

**Trade-off:** More complex — requires event publishing on every write, listener infrastructure.

---

## What FoodieHub uses and where

| Data | Strategy | Location | TTL |
|---|---|---|---|
| Restaurant list | TTL | food-service Redis | 10 min |
| JWT session | TTL | user-service Redis | 24h |
| Cart | Write-through (on every add/remove) | order-service MongoDB (not Redis) | — |
| Payment idempotency | Write-through | order-service Redis | 24h |
| Distributed lock | TTL | order-service Redis | 10s |

## The thundering herd problem
When many requests arrive simultaneously after a cache key expires:
```
Cache expires at 10:00:00
10:00:01 — 500 simultaneous requests → all miss → all hit MongoDB → DB overwhelmed
```

**Fix — cache stampede prevention using a lock:**
```java
String cached = redis.get(key);
if (cached != null) return cached;

// Only one thread rebuilds the cache
Boolean lock = redis.setIfAbsent("lock:" + key, "1", Duration.ofSeconds(5));
if (lock) {
    String fresh = fetchFromDB();
    redis.set(key, fresh, TTL);
    redis.delete("lock:" + key);
    return fresh;
} else {
    // Another thread is rebuilding — wait briefly and retry
    Thread.sleep(100);
    return redis.get(key);
}
```

## Interview talking points
- "FoodieHub uses TTL-based invalidation for restaurant listings — 10 minutes of staleness is acceptable for a menu, but I'd use event-driven invalidation if a restaurant could close suddenly and we needed immediate accuracy"
- "Cache-aside is the most common pattern — populate on miss, TTL handles expiry. The risk is the thundering herd on expiry: 500 requests simultaneously missing the cache and flooding MongoDB. A short-lived lock around the DB fetch prevents this"
- "Write-through keeps cache and DB always in sync but adds latency to every write. I use it for user sessions and payment idempotency keys — data that must be immediately consistent"
- "The hardest part of caching isn't the cache itself — it's deciding what staleness is acceptable for each piece of data, and then picking the strategy that matches that tolerance"

## What to implement in FoodieHub
- [ ] Current TTL invalidation is correct for restaurant listings — no change needed
- [ ] Consider event-driven invalidation for `isOpen` status — a restaurant toggling open/closed should reflect immediately, not after 10 minutes
- [ ] Add thundering herd protection to the restaurant cache if traffic grows
