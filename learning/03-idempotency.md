# Idempotency

## What is it?
Making an operation safe to retry — calling it once or ten times produces the same result. Idempotent APIs don't create duplicate records even if the same request is sent multiple times.

## Why it matters
Networks are unreliable. A user clicks "Place Order", the payment succeeds, the order is created, but the response times out. The user clicks again — now they have two orders and two charges. This is a real problem Swiggy/Zomato deal with constantly.

## The exact failure scenario in FoodieHub
```
1. User pays via Razorpay (payment succeeds — money is taken)
2. Angular calls POST /api/v1/payments/verify
3. Backend verifies signature → creates order → starts to send response
4. Network drops — Angular gets a timeout error
5. Angular retries POST /api/v1/payments/verify
6. Without idempotency → second order created, user charged twice
7. With idempotency → Redis hit → same order returned, no duplicate
```

## Why razorpayOrderId is the perfect key
The learning notes originally suggested generating a UUID on the frontend. We didn't need to — `razorpayOrderId` is already a unique key Razorpay issues per checkout session:
- One payment → one `razorpayOrderId`
- Can't be replayed on a different payment (HMAC signature would fail)
- Already in the request body — no frontend change needed

## Implementation in PaymentServiceImpl.verifyAndPlace()

```
Redis key: idempotency:razorpay:{razorpayOrderId}
Value:     serialized Order JSON
TTL:       24 hours
```

```java
// 0. Idempotency check — razorpayOrderId is unique per checkout session
String idemKey = "idempotency:razorpay:" + req.getRazorpayOrderId();
String cached  = redisTemplate.opsForValue().get(idemKey);
if (cached != null) {
    return objectMapper.readValue(cached, Order.class);  // return original, no duplicate
}

// 1. Verify HMAC signature
// 2. Create order
Order order = orderService.placeOrder(userId, placeReq);

// 3. Cache the result so retries get the same order back
redisTemplate.opsForValue().set(idemKey, objectMapper.writeValueAsString(order), Duration.ofHours(24));

return order;
```

The check happens **before** signature verification — if we already processed this `razorpayOrderId`, we return immediately without doing any work.

## Redis key in context
```
session:{userId}                    → JWT token (user-service)        TTL: 24h
cart:{userId}                       → cart items (cart is in MongoDB now, not Redis)
cache:restaurants                   → restaurant list (food-service)   TTL: 10min
idempotency:razorpay:{razorpayOrderId} → Order JSON (order-service)   TTL: 24h
```

## Why cache the full response?
The cached value is the full serialized `Order` object. On retry, the client gets back the exact same order ID, status, and items — not a generic "already processed" message. Angular's navigation to `/user/orders/{id}` works correctly on both the first call and any retry.

## What NOT to do
- ❌ Don't generate a frontend UUID — `razorpayOrderId` is already unique and already in the request
- ❌ Don't put the idempotency check after signature verification — the point is to skip all processing, not just the DB write
- ❌ Don't use 5-minute TTL — 24 hours covers all realistic retry windows; short TTL means a slow retry still creates a duplicate

## Interview talking points
- "I used `razorpayOrderId` as the idempotency key — it's already unique per checkout session so no frontend change was needed"
- "The check happens before signature verification so a retry is essentially free — one Redis GET and we're done"
- "I cache the full Order object, not just a flag — so the retry response is identical to the original, including the order ID Angular navigates to"
- "24-hour TTL covers all realistic retry scenarios; after that, the Razorpay order itself would have expired anyway"

## See also
For how idempotency differs from distributed locking (a related but different problem), see `06-distributed-locking.md` → "Idempotency vs Distributed Locking" section.
