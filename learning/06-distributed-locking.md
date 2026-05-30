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
- [ ] Add distributed lock around `OrderService.placeOrder()`
- [ ] Lock key: `lock:order:{userId}` — one order at a time per user
- [ ] Return HTTP 409 Conflict if lock can't be acquired
- [ ] Angular: disable the "Place Order" button after first click until response received
