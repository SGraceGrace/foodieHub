# Order Service

**Port:** 8083  
**Database:** MongoDB (`foodiehub_food`)  
**Tech:** Spring Boot 3.x, Spring Data MongoDB, Redis (distributed locking + idempotency), RabbitMQ, Razorpay Java SDK  
**File:** `backend/order-service`

---

## Responsibilities

- Shopping cart management (multi-restaurant, stored in MongoDB)
- Order placement with bill calculation (subtotal, delivery fee, GST)
- Payment flow (Razorpay: initiate → verify → place order)
- Coupon validation and usage tracking
- Order lifecycle tracking (PLACED → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED)
- Driver flow (accept order, update status, earnings dashboard)
- Restaurant order management (view live orders, accept, update status)
- Admin stats and order management
- RabbitMQ event publishing (order.placed, order.status.updated, order.cancelled)
- Transactional Outbox pattern for reliable event delivery

---

## MongoDB Collections

### Cart document

```json
{
  "_id": "ObjectId",
  "userId": "user@email.com",
  "restaurants": [
    {
      "restaurantId": "rest123",
      "restaurantName": "Spice Garden",
      "items": [
        {
          "menuItemId": "item-uuid",
          "name": "Butter Chicken",
          "price": 340.0,
          "qty": 2,
          "isVeg": false
        }
      ]
    }
  ],
  "updatedAt": "2025-06-15T10:00:00Z"
}
```

A cart supports items from **multiple restaurants simultaneously**. Each restaurant's items are grouped into a `RestaurantCart` bucket. When an order is placed for restaurant A, only that bucket is converted to an order and removed — items from restaurant B remain in the cart.

### Order document

```json
{
  "_id": "ObjectId",
  "userId": "user@email.com",
  "customerName": "Grace R",
  "restaurantId": "rest123",
  "restaurantName": "Spice Garden",
  "items": [
    { "menuItemId": "item-uuid", "name": "Butter Chicken", "price": 340.0, "qty": 2, "isVeg": false }
  ],
  "subtotal": 680.0,
  "deliveryFee": 0.0,
  "gst": 34.0,
  "totalAmount": 714.0,
  "restaurantEarnings": 680.0,
  "deliveryAddress": "42, Gandhi Nagar, Chennai",
  "status": "PLACED",
  "restaurantStatus": "PLACED",
  "driverStatus": null,
  "paymentId": "pay_ABC123",
  "paymentStatus": "PAID",
  "driverEmail": null,
  "driverEarnings": null,
  "driverRating": null,
  "rated": false,
  "createdAt": "2025-06-15T10:00:00Z",
  "updatedAt": "2025-06-15T10:05:00Z"
}
```

**Key fields:**

- `restaurantEarnings` — the food subtotal only. Restaurant keeps the food value; delivery fee and GST stay with the platform. Frozen at order creation; does not change if the order is later cancelled.
- `driverEarnings` — 15% of `totalAmount`, frozen when the driver accepts the order. Computed once at `acceptOrder()` so the figure does not change if the order value is adjusted later.
- `restaurantStatus` + `driverStatus` — separate tracking fields. The main `status` field is the customer-facing display value:
  - Restaurant sets: PLACED → CONFIRMED → PREPARING → READY
  - Driver sets: DRIVER_ASSIGNED, PICKED_UP (maps to OUT_FOR_DELIVERY), DELIVERED
- `rated` — set to `true` after the customer submits a rating. Used by the UI to replace the "Rate Order" button with a "⭐ Rated" badge.

### Outbox event document

```json
{
  "_id": "ObjectId",
  "aggregateId": "orderId123",
  "eventType": "order.placed",
  "exchange": "foodiehub.exchange",
  "routingKey": "order.placed",
  "payloadClass": "com.project.orderservice.messaging.OrderPlacedEvent",
  "payloadJson": "{ ...serialized event... }",
  "sent": false,
  "createdAt": "2025-06-15T10:00:00Z",
  "sentAt": null
}
```

---

## Transactional Outbox Pattern

When an order is placed, the service must both save the order to MongoDB **and** publish an `order.placed` event to RabbitMQ. If RabbitMQ is temporarily down, publishing directly from the service call would fail silently, losing the event.

The Outbox pattern solves this:

```
placeOrder():
  1. Save Order to MongoDB
  2. Save OutboxEvent to MongoDB (in same logical operation)
  3. Return Order to caller

OutboxPoller (runs every 5s):
  1. Find all OutboxEvent documents where sent=false
  2. For each: rabbitTemplate.convertAndSend(exchange, routingKey, payload)
  3. Mark sent=true + set sentAt
```

The outbox event and the order are both in MongoDB, so if the order save succeeds, the event is guaranteed to be saved too. The `OutboxPoller` is a `@Scheduled` component that reliably delivers events even if RabbitMQ was down at order placement time.

**Trade-off:** There is a up to ~5-second delay between order placement and RabbitMQ publication. This is acceptable — the customer sees "Order placed" immediately, and the restaurant gets the SSE notification within 5 seconds.

---

## Bill Calculation

```java
double subtotal    = items.stream().mapToDouble(i -> i.getPrice() * i.getQty()).sum();
double deliveryFee = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;  // 30.0 below ₹500
double gst         = Math.round(subtotal * GST_RATE);                      // 5%
double total       = subtotal + deliveryFee + gst;
```

Constants:
- `DELIVERY_FEE = 30.0` (₹30)
- `FREE_DELIVERY_ABOVE = 500.0` (free delivery on orders ≥ ₹500)
- `GST_RATE = 0.05` (5%)
- `DRIVER_COMMISSION = 0.15` (15% of total amount)

---

## Payment Flow (Razorpay)

Payment is a **3-step flow**:

```
Step 1: Initiate
  POST /api/v1/payments/initiate { restaurantId, couponCode }
    │
    ├── Load cart → compute bill → apply coupon discount
    ├── Create Razorpay order (POST to Razorpay API)
    └── Return { razorpayOrderId, amount (paise), keyId, discountAmount }

Step 2: Modal (client-side)
  Angular opens Razorpay payment modal with razorpayOrderId
  Customer selects UPI/card/wallet → Razorpay processes payment
  Razorpay returns: { razorpayOrderId, razorpayPaymentId, razorpaySignature }

Step 3: Verify + Place
  POST /api/v1/payments/verify { razorpayOrderId, razorpayPaymentId,
                                 razorpaySignature, restaurantId,
                                 deliveryAddress, customerName,
                                 couponCode, discountAmount }
    │
    ├── Idempotency check: Redis.get("idempotency:razorpay:{razorpayOrderId}")
    │     If exists → return cached order (network retry safety)
    │
    ├── HMAC-SHA256 verify: signature == HMAC(razorpayOrderId + "|" + paymentId, keySecret)
    │     If mismatch → 400 Bad Request (payment tampered or replayed)
    │
    ├── Increment coupon usage if coupon was applied
    ├── OrderService.placeOrder() → save order + outbox event + clear cart
    ├── Cache result: Redis.set("idempotency:razorpay:{razorpayOrderId}", order, TTL=24h)
    └── Return Order
```

### Signature verification

Razorpay signs the payment confirmation as:
```
signature = HMAC-SHA256(razorpayOrderId + "|" + razorpayPaymentId, razorpayKeySecret)
```

The backend recomputes this and compares hex strings. If they match, the payment is confirmed and untampered. This is a critical security check — without it, a client could forge a payment success and get an order for free.

### Idempotency

The `verifyAndPlace` endpoint is idempotent. If the client retries after a network drop (payment succeeded but the response was lost), the second call finds the cached order in Redis and returns it without creating a duplicate order or double-charging.

---

## Distributed Lock (Duplicate Order Prevention)

```java
String lockKey   = "lock:order:" + userId;
String lockValue = UUID.randomUUID().toString();
Boolean acquired = redisTemplate.opsForValue()
        .setIfAbsent(lockKey, lockValue, Duration.ofSeconds(10));

if (!Boolean.TRUE.equals(acquired)) {
    throw new OrderConflictException("Order already being processed, please wait");
}
```

Redis `SET NX` (set-if-not-exists) acquires a 10-second lock per user. This prevents a customer from double-submitting an order (e.g., double-clicking the checkout button) and creating two identical orders simultaneously.

The lock value is a UUID. The release code checks `current == lockValue` before deleting, which prevents releasing a lock that was re-acquired by a second request after the first's TTL expired.

---

## Order Lifecycle

```
PLACED
  │ (restaurant confirms)
  ▼
CONFIRMED
  │ (restaurant starts cooking)
  ▼
PREPARING
  │ (food is ready, waiting for driver)
  ▼
READY
  │ (driver accepts order)
  ▼
DRIVER_ASSIGNED (notification event only, does not change main status)
  │ (driver picks up food)
  ▼
OUT_FOR_DELIVERY
  │ (driver delivers)
  ▼
DELIVERED ──────────────── (terminal)

At any point → CANCELLED (terminal)
```

### Status update rules

- **Restaurant** updates: PLACED → CONFIRMED, CONFIRMED → PREPARING, PREPARING → READY
- **Driver** updates: DRIVER_ASSIGNED (via `acceptOrder()`), PICKED_UP (→ maps to OUT_FOR_DELIVERY on main status), DELIVERED
- When `PICKED_UP` is set: `driverStatus = PICKED_UP`, `status = OUT_FOR_DELIVERY` (food has left the restaurant — the customer-facing status should reflect that)
- When `CANCELLED` with a `paymentId`: an `order.cancelled` event is published so notification-service can send a refund notification email

### Why two status fields?

`restaurantStatus` and `driverStatus` track each actor's view independently. The main `status` field is the merged, customer-facing status. This allows the restaurant and driver UIs to update their own status without stepping on each other's writes, while the customer always sees a coherent single status.

---

## Coupon System

### Coupon document

```json
{
  "code": "FLAT50",
  "description": "Flat ₹50 off on orders above ₹200",
  "discountType": "FLAT",
  "discountValue": 50.0,
  "minOrderValue": 200.0,
  "expiresAt": "2025-12-31T23:59:59Z",
  "usageLimit": 100,
  "usedCount": 23,
  "active": true
}
```

Discount types: `FLAT` (fixed amount off) and `PERCENTAGE` (percentage of subtotal).

### Validation flow

```
POST /api/v1/coupons/validate { code, orderAmount }
  │
  ├── Find coupon by code
  ├── Check: coupon.active == true
  ├── Check: now < coupon.expiresAt
  ├── Check: orderAmount >= coupon.minOrderValue
  ├── Check: coupon.usedCount < coupon.usageLimit
  └── Return { valid: true, discountAmount, message }
```

Usage is incremented **after** successful payment verification, not at validation time. This prevents a coupon from being consumed if the payment fails. If two concurrent users try to apply the same coupon to the last usage slot, both validations may pass but one of the `incrementUsage()` calls will push `usedCount` above `usageLimit` — a non-critical over-issue that can be addressed with a MongoDB `findAndModify` with a condition.

---

## Driver Flow

### Available orders

`GET /api/orders/available` returns orders with `status IN ('PLACED', 'CONFIRMED', 'PREPARING', 'READY')` and no `driverEmail` assigned. Drivers see these in their workspace.

`PLACED` orders are visible to drivers so they can see new orders early, but drivers cannot accept them until the restaurant confirms (`acceptOrder()` blocks on `PLACED` status with a 409).

### Accept order

```java
order.setDriverEmail(driverEmail);
order.setDriverStatus("DRIVER_ASSIGNED");
order.setDriverEarnings(Math.round(totalAmount * 0.15 * 100.0) / 100.0);
```

The driver's earnings are frozen at acceptance time. If the order value changes later (e.g., partial refund — not implemented yet), the driver's cut stays at the original agreed amount.

### Earnings dashboard

`getDriverEarnings()` returns:
- Today's earnings + deliveries (IST date boundary)
- This week's earnings + deliveries (Monday–Sunday IST)
- All-time earnings + deliveries
- Per-day breakdown for the current week (for the bar chart)
- Completion rate (delivered / (delivered + cancelled))
- Average driver rating

All calculations are done in-memory from MongoDB queries, not pre-aggregated. For a portfolio project this is fine; a production system would use MongoDB aggregation pipelines or a materialized view.

---

## API Reference

### Cart (requires auth, role: END_USERS)

| Method | Path | Description |
|---|---|---|
| POST | `/api/cart/add` | Add item to cart |
| GET | `/api/cart` | Get own cart |
| DELETE | `/api/cart/clear` | Clear entire cart |
| DELETE | `/api/cart/{restaurantId}/remove/{itemId}` | Remove specific item |

### Orders (requires auth)

| Method | Path | Auth role | Description |
|---|---|---|---|
| POST | `/api/orders` | END_USERS | Place order from cart |
| GET | `/api/orders` | END_USERS | Own order history |
| GET | `/api/orders/{id}` | END_USERS | Single order |
| PATCH | `/api/orders/{id}/rated` | END_USERS | Mark order as rated |
| PUT | `/api/orders/{id}/status` | RESTAURANT_OWNER | Update order status (restaurant side) |
| GET | `/api/orders/restaurant/{restaurantId}` | RESTAURANT_OWNER | Live restaurant orders |
| GET | `/api/orders/restaurant/{restaurantId}/all` | RESTAURANT_OWNER | All orders with date range filter |
| GET | `/api/orders/available` | DRIVER | Available orders to accept |
| POST | `/api/orders/{id}/accept` | DRIVER | Accept an order |
| GET | `/api/orders/driver/active` | DRIVER | Current active delivery |
| GET | `/api/orders/driver/history` | DRIVER | Completed delivery history |
| GET | `/api/orders/driver/earnings` | DRIVER | Earnings dashboard |
| GET | `/api/orders/admin` | ADMIN | All orders with status filter |
| GET | `/api/orders/restaurant/{id}/stats` | RESTAURANT_OWNER | Restaurant revenue stats |
| GET | `/api/orders/admin/stats` | ADMIN | Platform-wide order stats |

### Payments (requires auth, role: END_USERS)

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/payments/initiate` | Create Razorpay order |
| POST | `/api/v1/payments/verify` | Verify payment + place order |

### Coupons

| Method | Path | Auth role | Description |
|---|---|---|---|
| GET | `/api/v1/coupons/active` | Public | List active coupons for display |
| POST | `/api/v1/coupons/validate` | END_USERS | Validate a coupon code |
| POST | `/api/v1/admin/coupons` | ADMIN | Create coupon |
| GET | `/api/v1/admin/coupons` | ADMIN | List all coupons |
| PATCH | `/api/v1/admin/coupons/{id}/toggle` | ADMIN | Activate/deactivate coupon |
| DELETE | `/api/v1/admin/coupons/{id}` | ADMIN | Delete coupon |
