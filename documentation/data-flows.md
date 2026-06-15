# Data Flows — Key Operations

Detailed request traces for the most important user journeys in FoodieHub.

---

## 1. Customer Login

```
[Browser] POST /api/v1/auth/login
  { username: "user@email.com", password: "Password@1", deviceId: "browser-uuid" }
           │
           ▼
[API Gateway — Port 8080]
  JwtAuthFilter:  /api/v1/auth/login is in ALWAYS_PUBLIC → skip JWT check
  Routing:        → user-service:8081
           │
           ▼
[user-service — Port 8081]
  AuthController.login()
    │
    ├── UserDetailsService.loadUserByUsername("user@email.com")
    │     → SELECT * FROM user WHERE username = 'user@email.com'
    │     → SELECT r.name FROM role r JOIN user_roles ur ON ... WHERE ur.user_id = ?
    │
    ├── BCryptPasswordEncoder.matches(rawPassword, user.passwordHash)  →  true
    │
    ├── JwtService.generateToken(user)
    │     → Claims: { sub: "user@email.com", role: [{authority: "ROLE_END_USERS"}], exp: +24h }
    │     → Sign with HMAC-SHA256(JWT_KEY)
    │
    ├── Redis.set("session:user@email.com:browser-uuid", jwtToken, TTL=24h)
    │
    ├── RefreshTokenService.createRefreshToken(userId)
    │     → INSERT INTO refresh_token (token=UUID, user_id=?, expiry_date=now+7d)
    │
    └── Response 200: { token, refreshToken, userId, email, firstName, role }
           │
           ▼
[Browser]  stores token + refreshToken in localStorage
```

---

## 2. Browse Restaurants (authenticated)

```
[Browser] GET /api/v1/restaurants?page=0&size=10
  Authorization: Bearer <jwt>
           │
           ▼
[API Gateway — Port 8080]
  JwtAuthFilter:  /api/v1/restaurants is in GET_PUBLIC_PATHS
    → JWT present + valid → inject X-User-Id + X-User-Role
  Routing:        → food-service:8082 (route: food-service-restaurants)
  Circuit breaker: food-service (50% failure threshold)
           │
           ▼
[food-service — Port 8082]
  HeaderAuthFilter: reads X-User-Id → populates SecurityContext
  RestaurantController.getAll(cuisine=null, lat=null, lng=null, sort=null, page=0, size=10)
    │
    ├── Spring Cache check: key "null_null_0_10" in "restaurants" cache
    │     MISS (first request)
    │
    ├── RestaurantServiceImpl.getAll()
    │     → restaurantRepo.findByStatus(ACTIVE, PageRequest.of(0, 10))
    │     → MongoDB: db.restaurants.find({status:"ACTIVE"}).limit(10).skip(0)
    │
    ├── Store result in Redis: key="restaurants::null_null_0_10", TTL=10min
    │
    └── Response 200: PaginatedResponse<Restaurant>
           │
           ▼
[Browser]  subsequent identical requests hit Redis cache, not MongoDB
```

**If `lat` and `lng` are provided:**

```
food-service:
  → condition "#lat == null && #lng == null" is false → NO cache
  → MongoTemplate.geoNear(NearQuery.near(lng, lat).maxDistance(10km))
    → MongoDB: db.restaurants.aggregate([{ $geoNear: { near: {type:"Point", coordinates:[lng,lat]},
                distanceField:"dist", maxDistance:10000, spherical:true } }])
  → Map GeoResult distance to restaurant.distanceKm
  → Sort in-memory by requested sort field
```

---

## 3. Place Order (with payment)

```
Step 1: Initiate Payment
[Browser] POST /api/v1/payments/initiate
  { restaurantId: "rest123", couponCode: "FLAT50" }
  Authorization: Bearer <jwt>
           │
           ▼
[API Gateway] → validate JWT → inject headers → route to order-service:8083
           │
           ▼
[order-service]
  PaymentController.initiatePayment()
    │
    ├── Load cart from MongoDB for this userId
    ├── Find restaurantId bucket in cart
    ├── Calculate: subtotal=680, deliveryFee=0 (≥₹500), gst=34, total=714
    ├── Validate coupon "FLAT50": 50 off → total=664, min=1 (Razorpay limit)
    ├── Razorpay API: POST https://api.razorpay.com/v1/orders
    │     { amount: 66400, currency: "INR", receipt: "fh_1718448000" }
    │     → Response: { id: "order_XYZ", amount: 66400 }
    └── Response: { razorpayOrderId: "order_XYZ", amount: 66400, keyId: "rzp_live_..." }

Step 2: Payment (browser — not our server)
[Browser] opens Razorpay modal with razorpayOrderId="order_XYZ"
  Customer pays via UPI
  Razorpay: { razorpayPaymentId: "pay_ABC", razorpaySignature: "<hmac>" }

Step 3: Verify + Place
[Browser] POST /api/v1/payments/verify
  { razorpayOrderId, razorpayPaymentId, razorpaySignature,
    restaurantId, deliveryAddress, customerName, couponCode, discountAmount }
           │
           ▼
[order-service]
  PaymentController.verifyAndPlace()
    │
    ├── Redis.get("idempotency:razorpay:order_XYZ") → null (first attempt)
    │
    ├── HMAC-SHA256 verify:
    │     HMAC("order_XYZ|pay_ABC", rzpKeySecret) == razorpaySignature → PASS
    │
    ├── couponService.incrementUsage("FLAT50")
    │     → MongoDB: db.coupons.updateOne({code:"FLAT50"}, {$inc: {usedCount: 1}})
    │
    ├── OrderService.placeOrder(userId, req)
    │     │
    │     ├── Redis.setIfAbsent("lock:order:user@email.com", uuid, TTL=10s)
    │     │     → acquired = true
    │     │
    │     ├── Load cart from MongoDB
    │     ├── Map cart items → OrderItem[]
    │     ├── Calculate bill: subtotal=680, deliveryFee=0, gst=34, total=714
    │     ├── Build Order: { userId, restaurantId, items, subtotal, gst, total,
    │     │                  deliveryAddress, status="PLACED", paymentId="pay_ABC",
    │     │                  paymentStatus="PAID", restaurantEarnings=680 }
    │     ├── MongoDB: db.orders.insertOne(order) → orderId="order_mongo_123"
    │     ├── Remove restaurant bucket from cart → update cart (or delete if empty)
    │     │
    │     ├── Build OutboxEvent: { eventType="order.placed", payloadJson="...", sent=false }
    │     ├── MongoDB: db.outbox_events.insertOne(outboxEvent)
    │     │
    │     ├── Redis.delete("lock:order:user@email.com")
    │     └── Return Order
    │
    ├── Redis.set("idempotency:razorpay:order_XYZ", orderJson, TTL=24h)
    └── Response 200: Order

Background — OutboxPoller (every 5s):
    ├── Find OutboxEvent where sent=false
    ├── rabbitTemplate.convertAndSend("foodiehub.exchange", "order.placed", OrderPlacedEvent)
    └── MongoDB: update outboxEvent { sent=true, sentAt=now }
           │
           ▼
[RabbitMQ] routes to:
  order.placed.queue     → notification-service.onOrderPlaced()
  driver.order.placed.queue → notification-service.onDriverOrderPlaced()
           │
           ▼
[notification-service]
  onOrderPlaced(event):
    ├── SseEmitterService.pushToRestaurant(restaurantId, RestaurantNotificationDTO)
    │     → SSE frame sent to restaurant partner's open browser tab
    │
    ├── EmailService.sendOrderConfirmation(customerEmail, order details)
    │     → SMTP via Gmail → customer inbox
    │
    └── MongoDB: db.customer_notifications.insertOne(...)

  onDriverOrderPlaced(event):
    └── SseEmitterService.pushToDriver(driverEmail, DriverOrderNotificationDTO)
          → SSE frame sent to all connected drivers (new order available)
```

---

## 4. Order Status Update (Restaurant → Customer notification)

```
[Restaurant Partner browser] PUT /api/orders/{orderId}/status
  { status: "CONFIRMED" }
  Authorization: Bearer <jwt>  (role: RESTAURANT_OWNER)
           │
           ▼
[API Gateway] → validate JWT → route to order-service:8083
           │
           ▼
[order-service]
  OrderController.updateStatus()
    │
    ├── Find order by ID
    ├── "CONFIRMED" not in DRIVER_STATUSES → restaurant status path
    ├── order.restaurantStatus = "CONFIRMED"
    ├── order.status = "CONFIRMED"
    ├── order.updatedAt = now
    ├── MongoDB: save order
    │
    ├── rabbitTemplate.convertAndSend("foodiehub.exchange", "order.status.updated",
    │     OrderStatusUpdatedEvent { orderId, userId, newStatus:"CONFIRMED" })
    │
    └── Response 200: updated Order
           │
           ▼
[RabbitMQ] → order.status.updated.queue → notification-service
           │
           ▼
[notification-service]
  onOrderStatusUpdated(event):
    │
    ├── Build CustomerOrderUpdateDTO { orderId, status:"CONFIRMED", message:"Order confirmed!" }
    │
    ├── SseEmitterService.pushToCustomer(userId, dto)
    │     → Loop customerSessions, find matching userId
    │     → SseEmitter.send(dto as JSON)
    │     → Browser EventSource.onmessage fires in Angular
    │     → OrderTrackerComponent updates tracker step
    │
    ├── WebPushService.sendToCustomer(userId, "Spice Garden", "Your order is confirmed!", "/user/orders")
    │     → Fetch CustomerPushSubscription[] from MongoDB for userId
    │     → For each subscription: HTTP POST to subscription.endpoint
    │         (FCM/Mozilla push service)
    │         → Service worker sw.js fires → OS notification shown
    │
    └── MongoDB: db.customer_notifications.insertOne(...)
```

---

## 5. Google OAuth2 Login

```
[Browser] clicks "Continue with Google"
  → Angular navigates to: GET /oauth2/authorization/google
           │
           ▼
[API Gateway] routes to user-service:8081 (route: user-service-oauth2)
           │
           ▼
[user-service]
  Spring Security OAuth2 redirects to Google:
  https://accounts.google.com/o/oauth2/v2/auth?
    client_id=...&redirect_uri=http://localhost:8080/login/oauth2/code/google&scope=email profile
           │
[Google] shows consent screen → user approves
           │
[Google] redirects back:
  GET http://localhost:8080/login/oauth2/code/google?code=AUTH_CODE&state=...
           │
           ▼
[API Gateway] → user-service:8081 (route: user-service-oauth2)
           │
           ▼
[user-service]
  Spring Security exchanges code for tokens (POST to accounts.google.com/token)
  OAuth2UserService.loadUser():
    → GET https://www.googleapis.com/oauth2/v3/userinfo
    → { email, given_name, family_name, sub }
    │
    ├── Find user by email in MySQL
    │     EXISTS: update (authProvider=GOOGLE)
    │     NEW: INSERT with password=null, authProvider=GOOGLE, role=END_USERS
    │
    └── OAuth2SuccessHandler:
          ├── JwtService.generateToken(user) → JWT
          ├── createRefreshToken(userId) → DB entry
          ├── Redis.set("session:{email}:{deviceId}", jwt, TTL=24h)
          └── Redirect to: http://localhost:4200/oauth2/callback?token=JWT&refreshToken=RT
           │
           ▼
[Browser] /oauth2/callback route:
  → Read token + refreshToken from query params
  → Store in localStorage
  → Navigate to /home
```

---

## 6. Token Refresh

```
[Angular HTTP interceptor]
  → Request fails with 401 (token expired)
  → Intercept 401 response
  → Check: is a refresh in progress? (prevents parallel refresh storms)
  │
  ▼
POST /api/v1/refresh-token { refreshToken: "..." }
           │
           ▼
[API Gateway] → ALWAYS_PUBLIC path → no JWT check → user-service:8081
           │
           ▼
[user-service]
  RefreshTokenController.refresh()
    │
    ├── SELECT * FROM refresh_token WHERE token = ?
    ├── Check: token.expiryDate > now
    │
    ├── Generate new JWT for token.user
    ├── Redis.set("session:{email}:{deviceId}", newJwt, TTL=24h)
    │
    ├── DELETE FROM refresh_token WHERE token = oldToken  (rotation)
    ├── INSERT new refresh token
    │
    └── Response: { token: newJwt, refreshToken: newRefreshToken }
           │
           ▼
[Angular interceptor]
  → Store new tokens in localStorage
  → Retry original failed request with new token
  → Resume normal operation (user doesn't notice the refresh)
```
