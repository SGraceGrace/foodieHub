# Distributed Locking

## What is it?
A lock that works across multiple servers/instances. Prevents two processes in different JVMs from executing the same critical section simultaneously.

## Why a regular Java lock doesn't work in microservices
`synchronized` and `ReentrantLock` only work within a single JVM. If you run two instances of order-service, they have separate JVMs — a Java lock in one does nothing to the other.

## The problem in FoodieHub
Race condition on cart → order:
```
User double-clicks "Place Order"
  Request A: reads cart → starts creating order →
  Request B: reads cart → starts creating order →
    → Two orders created from the same cart
```

Also: concurrent menu item availability updates from the restaurant dashboard.

## Redis as distributed lock (Redisson or manual SETNX)

### How it works
```
Process A: SET lock:cart:userId123 "A" NX PX 5000
           → Success (got the lock, expires in 5 seconds)

Process B: SET lock:cart:userId123 "B" NX PX 5000
           → Fail (key already exists) → wait or return error

Process A: finishes work → DEL lock:cart:userId123

Process B: retries → now gets the lock
```

`NX` = only set if Not eXists (atomic)
`PX 5000` = auto-expire in 5000ms (safety net if process crashes)

### Implementation in FoodieHub (Order Service)
```java
public OrderResponse placeOrder(String userId, PlaceOrderRequest req) {
    String lockKey = "lock:order:" + userId;
    String lockValue = UUID.randomUUID().toString();
    Boolean acquired = redisTemplate.opsForValue()
        .setIfAbsent(lockKey, lockValue, Duration.ofSeconds(10));

    if (!acquired) {
        throw new ConflictException("Order already being processed, please wait");
    }

    try {
        return doPlaceOrder(userId, req);
    } finally {
        // Only release YOUR lock (not someone else's if TTL expired)
        String current = redisTemplate.opsForValue().get(lockKey);
        if (lockValue.equals(current)) {
            redisTemplate.delete(lockKey);
        }
    }
}
```

### Using Redisson (production-grade, handles edge cases)
```xml
<dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson-spring-boot-starter</artifactId>
    <version>3.27.0</version>
</dependency>
```
```java
RLock lock = redissonClient.getLock("lock:order:" + userId);
lock.lock(10, TimeUnit.SECONDS);
try {
    return doPlaceOrder(userId, req);
} finally {
    lock.unlock();
}
```

Redisson handles the "release only your own lock" edge case automatically using Lua scripts.

## Redis key pattern
```
lock:order:{userId}    →  lock-uuid    TTL: 10s
```

## Interview talking points
- "I use Redis as a distributed lock for the order placement flow — Redis's SETNX operation is atomic, so even with multiple instances of order-service, only one request per user can place an order at a time"
- "The lock has a 10-second TTL as a safety net — if the service crashes mid-operation, the lock auto-expires so other requests aren't blocked forever"
- "I store the lock owner's UUID and only release the lock if I'm still the owner — prevents a slow process from releasing another process's lock after TTL expiry"

## What to implement in FoodieHub
- [x] Add distributed lock around `OrderService.placeOrder()`
- [x] Lock key: `lock:order:{userId}` — one order at a time per user
- [x] Return HTTP 409 Conflict if lock can't be acquired
- [x] Angular: disable the "Place Order" button after first click until response received

---

## Idempotency vs Distributed Locking

Two different problems, often confused because both deal with "what if the same request runs twice."

### Distributed Locking — concurrent requests
Two requests arrive **at the same time** and race each other.
```
t=0ms  Request A arrives ─┐
t=1ms  Request B arrives ─┤─ both reading cart simultaneously
t=5ms  A creates order     │
t=6ms  B creates order   ──┘ ← duplicate, same cart
```
Fix: let only one in at a time. Block the second until the first finishes.

### Idempotency — retried requests
The **same request** is retried after a failure — network dropped, client timed out, user hit refresh.
```
t=0ms     Request A sent → server processes → order created
t=3000ms  Client timeout (didn't get response)
t=3001ms  Client retries → server processes again → duplicate order
```
Fix: detect "I've seen this exact request before" and return the cached result instead of processing again.

### Side-by-side

| | Distributed Lock | Idempotency |
|---|---|---|
| Threat | Two **different** requests, same time | Same request **retried** later |
| Window | Milliseconds | Seconds to hours |
| How | Block one until the other finishes | Recognize and deduplicate |
| Storage | Short TTL lock key (10s) | Long TTL result cache (24h+) |
| After success | Lock is deleted | Cache entry stays |

### FoodieHub uses both

**Distributed lock** — `placeOrder()` (this file):
```
lock:order:{userId}  →  uuid  →  TTL: 10s
```

**Idempotency** — `PaymentServiceImpl` (see `03-idempotency.md`):
```
idempotency:razorpay:{razorpayOrderId}  →  Order JSON  →  TTL: 24h
```

For `placeOrder` you actually want **both** — the lock stops the double-click race, and the idempotency key on the Razorpay order ID stops the "payment webhook fired twice" problem.

### When to use which
- Use a **lock** when the danger is concurrent execution right now.
- Use **idempotency** when the danger is a client retrying because it didn't get a response.

---

## Key observations (understood while implementing)

### Why `synchronized` fails in microservices
Java's `synchronized` and `ReentrantLock` only protect within a single JVM. Two instances of order-service have completely separate memory — a lock in one instance is invisible to the other. Redis lives outside all JVMs, so it acts as the shared lock store every instance can see.

### What NX actually guarantees
`SET key value NX` is atomic at the Redis level — check-and-set happens in one operation. There is no gap between "check if key exists" and "set it" where another request can sneak in. This is the core of why Redis works as a lock.

### The UUID trick — why not just `delete(lockKey)`?
Scenario without UUID check:
1. Request A acquires lock, starts processing
2. Processing takes >10s — TTL expires, Redis auto-deletes the key
3. Request B acquires the lock (key is gone)
4. Request A finishes — blindly deletes the key
5. Request B's lock is now gone — Request C can run alongside B → race condition

With UUID check, step 4 reads the current value first. It no longer matches A's UUID (B's UUID is there now), so A skips the delete. B's lock stays intact.

### Angular was already protected
`[disabled]="!deliveryAddress || !!placingOrder"` on the cart button + the `placingOrder` state variable already prevented double-clicks on the frontend. The backend lock is the real safety net — the frontend guard is just UX.
