# Idempotency

## What is it?
Making an operation safe to retry — calling it once or ten times produces the same result. Idempotent APIs don't create duplicate records even if the same request is sent multiple times.

## Why it matters
Networks are unreliable. A user clicks "Place Order", the request reaches the server, the order is created, but the response times out. The user clicks again — now they have two orders. This is a real problem Swiggy/Zomato deal with constantly.

## How it works
Client generates a unique `Idempotency-Key` per action and sends it in the header. Server stores it in Redis with the result. On retry, server sees the key already exists and returns the stored result — no duplicate created.

```
First request:
  POST /api/orders
  Idempotency-Key: uuid-abc-123
  → Order created → store {uuid-abc-123: orderId-456} in Redis (TTL 24h)
  → Return order

Retry (same key):
  POST /api/orders
  Idempotency-Key: uuid-abc-123
  → Key found in Redis → return stored result immediately
  → No new order created
```

## Implementation in FoodieHub (Order Service)

```java
// IdempotencyFilter.java or inside OrderService.placeOrder()

public OrderResponse placeOrder(String idempotencyKey, PlaceOrderRequest req) {
    // Check if already processed
    String cached = redisTemplate.opsForValue().get("idempotency:" + idempotencyKey);
    if (cached != null) {
        return objectMapper.readValue(cached, OrderResponse.class);
    }

    // Process the order
    Order order = createOrder(req);

    // Store result in Redis (24h TTL)
    redisTemplate.opsForValue().set(
        "idempotency:" + idempotencyKey,
        objectMapper.writeValueAsString(order),
        Duration.ofHours(24)
    );

    return order;
}
```

Frontend generates the key once when checkout page loads:
```typescript
// Angular: generate once, reuse on retry
const idempotencyKey = crypto.randomUUID();
headers = { 'Idempotency-Key': idempotencyKey };
```

## Redis key pattern
```
idempotency:{uuid}  →  serialized order response  TTL: 24h
```

## Interview talking points
- "The Angular client generates a UUID when the checkout page loads and attaches it as a header. If the network drops and the user retries, the server recognises the key and returns the original order — no duplicate"
- "I store the full response in Redis so the retry gets back the exact same response, including the order ID"
- "24-hour TTL is enough — if a user hasn't retried after 24 hours the risk of duplicate is essentially zero"

## What to implement in FoodieHub
- [ ] Generate idempotency key in Angular checkout component (one UUID per checkout session)
- [ ] Add `Idempotency-Key` header to the place-order API call
- [ ] Check Redis before processing in `OrderService.placeOrder()`
- [ ] Store serialized response in Redis after successful order creation
- [ ] Return 200 (not 201) on idempotent replay so client knows it's a repeat
