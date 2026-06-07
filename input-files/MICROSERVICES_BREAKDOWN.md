# FoodieHub Microservices Architecture

Based on your CLAUDE.md, here's the complete microservices breakdown for your food delivery platform.

---

## 🏗️ Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Angular Frontend (4200)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│         API Gateway - Spring Cloud Gateway (8080)           │
│              Route & Auth Middleware                        │
└──────────┬─────────────┬──────────────┬─────────────────────┘
           │             │              │
      ┌────▼─────┐  ┌───▼──────┐  ┌───▼──────┐
      │ User Svc │  │ Food Svc │  │Order Svc │
      │  (8081)  │  │  (8082)  │  │  (8083)  │
      └────┬─────┘  └───┬──────┘  └───┬──────┘
           │             │              │
      ┌────▼─────┐  ┌───▼──────┐  ┌───▼──────┐
      │  MySQL   │  │ MongoDB  │  │ MongoDB  │
      │  (Users) │  │(Restau.) │  │(Orders)  │
      └──────────┘  └──────────┘  └──────────┘
           
           ┌──────────────────────────┐
           │   Redis (8-9 DBs)        │
           │ • Sessions & Cart        │
           │ • JWT Caching            │
           │ • Rate Limiting          │
           └──────────────────────────┘
           
           ┌──────────────────────────┐
           │   RabbitMQ (5672)        │
           │ • order.placed events    │
           │ • Async notifications    │
           └──────────────────────────┘
```

---

## 📦 The 3 Core Microservices

### **1. USER SERVICE** (Port 8081)
**Responsibility:** Authentication, User Management, Profiles

#### Database: MySQL
```sql
Tables:
  ├── users (id, name, email, password_hash, phone, role, created_at)
  ├── address (id, user_id, street, city, zip, is_default)
  └── user_preferences (id, user_id, cuisine_preferences, diet_type)
```

#### APIs:
```
Authentication:
  POST   /api/auth/register          → Register new user
  POST   /api/auth/login             → Login & get JWT token
  POST   /api/auth/logout            → Logout
  POST   /api/auth/refresh-token     → Refresh JWT token
  POST   /api/auth/verify-email      → Email verification
  POST   /api/auth/forgot-password   → Password reset

User Profile:
  GET    /api/users/me               → Get current user (JWT protected)
  PUT    /api/users/profile          → Update profile (name, phone)
  PUT    /api/users/address          → Update delivery address
  GET    /api/users/preferences      → Get user preferences
  PUT    /api/users/preferences      → Update food preferences

OAuth:
  GET    /api/auth/google/callback   → Google OAuth callback
```

#### Key Features:
- ✅ JWT Authentication (24h tokens)
- ✅ Refresh Token Management (7 days)
- ✅ Redis session caching
- ✅ Google OAuth2 integration
- ✅ Password validation rules
- ✅ Email verification
- ✅ Role-based access control (USER, ADMIN, RESTAURANT_OWNER)

#### Dependencies:
- MySQL 8
- Redis (JWT caching)
- Spring Security
- Spring OAuth2 Client

#### Load Estimate:
- 📊 Medium (most login requests concentrated at meal times)

---

### **2. FOOD SERVICE** (Port 8082)
**Responsibility:** Restaurants, Menus, Search, Ratings

#### Database: MongoDB
```json
Collections:
{
  "restaurants": {
    "_id": ObjectId,
    "name": "Restaurant Name",
    "cuisine": ["Indian", "Chinese"],
    "rating": 4.8,
    "totalReviews": 234,
    "deliveryTime": 30,  // minutes
    "deliveryFee": 2.99,
    "minOrderValue": 5.00,
    "isOpen": true,
    "operatingHours": {
      "monday": { "open": "10:00", "close": "23:00" },
      "...": "..."
    },
    "menu": [
      {
        "category": "Main Course",
        "items": [
          {
            "id": ObjectId,
            "name": "Butter Chicken",
            "description": "...",
            "price": 12.99,
            "isVeg": false,
            "image": "url",
            "available": true,
            "preparationTime": 15  // minutes
          }
        ]
      }
    ],
    "address": "...",
    "phone": "...",
    "image": "url",
    "createdAt": ISODate
  },
  
  "ratings": {
    "_id": ObjectId,
    "restaurantId": ObjectId,
    "userId": ObjectId,
    "rating": 4.5,
    "comment": "Great food!",
    "createdAt": ISODate
  }
}
```

#### APIs:
```
Restaurants:
  GET    /api/restaurants                    → List all restaurants
  GET    /api/restaurants?cuisine=Indian     → Filter by cuisine
  GET    /api/restaurants?rating=4.5         → Filter by rating
  GET    /api/restaurants/:id                → Single restaurant details
  GET    /api/restaurants/:id/menu           → Full menu

Search:
  GET    /api/search?q=biryani               → Search dishes + restaurants
  GET    /api/search/suggestions?q=bir       → Autocomplete suggestions

Categories:
  GET    /api/cuisines                       → All cuisine types
  GET    /api/cuisines/:name/restaurants     → Restaurants by cuisine

Ratings & Reviews:
  GET    /api/restaurants/:id/ratings        → Get restaurant ratings
  POST   /api/restaurants/:id/ratings        → Post rating (JWT protected)
  GET    /api/restaurants/:id/ratings/:ratingId → Get single rating
```

#### Key Features:
- ✅ Full-text search (Elasticsearch-ready)
- ✅ Filtering (cuisine, rating, delivery time, price)
- ✅ MongoDB for flexible schema
- ✅ Redis caching (restaurants list, 10 min TTL)
- ✅ Rating & review system
- ✅ Restaurant availability tracking
- ✅ Menu item availability

#### Dependencies:
- MongoDB 7
- Redis (restaurant list caching)
- Elasticsearch (optional for advanced search)

#### Load Estimate:
- 📊 HIGH (read-heavy, lots of browsing)

---

### **3. ORDER SERVICE** (Port 8083)
**Responsibility:** Cart Management, Orders, Order History, Status Tracking

#### Database: MongoDB
```json
Collections:
{
  "carts": {
    "_id": ObjectId,
    "userId": ObjectId,
    "restaurantId": ObjectId,
    "items": [
      {
        "dishId": ObjectId,
        "name": "Butter Chicken",
        "price": 12.99,
        "quantity": 2,
        "specialInstructions": "Less spicy"
      }
    ],
    "subtotal": 25.98,
    "deliveryFee": 2.99,
    "tax": 2.08,
    "total": 31.05,
    "expiresAt": ISODate  // 2 hour TTL
  },

  "orders": {
    "_id": ObjectId,
    "userId": ObjectId,
    "restaurantId": ObjectId,
    "restaurantName": "Pasta Paradise",
    "items": [...],
    "status": "CONFIRMED",  // PLACED → CONFIRMED → PREPARING → READY → DELIVERED
    "subtotal": 35.97,
    "deliveryFee": 2.99,
    "tax": 2.88,
    "total": 41.84,
    "deliveryAddress": "42 Main Street, New York",
    "estimatedDeliveryTime": 35,  // minutes
    "createdAt": ISODate,
    "updatedAt": ISODate,
    "events": [
      { "status": "PLACED", "timestamp": ISODate },
      { "status": "CONFIRMED", "timestamp": ISODate },
      { "...": "..." }
    ]
  }
}
```

#### APIs:
```
Cart Management:
  POST   /api/cart/add                 → Add item to cart (JWT protected)
  GET    /api/cart                     → Get current user's cart
  PUT    /api/cart/:itemId             → Update item quantity
  DELETE /api/cart/:itemId             → Remove item from cart
  DELETE /api/cart                     → Clear entire cart

Order Placement:
  POST   /api/orders                   → Place order from cart (JWT protected)
  GET    /api/orders                   → Get my order history
  GET    /api/orders/:id               → Get single order details
  PUT    /api/orders/:id/cancel        → Cancel order

Order Status (Tracking):
  GET    /api/orders/:id/status        → Get real-time order status
  GET    /api/orders/:id/timeline      → Get order event timeline
  WS     /api/orders/:id/live          → WebSocket for live tracking (future)

Admin/Restaurant:
  PUT    /api/orders/:id/status        → Update order status
  GET    /api/orders/restaurant/:restaurantId → Restaurant's orders
```

#### Key Features:
- ✅ Cart in Redis (2h TTL, fast access)
- ✅ Order persistence in MongoDB
- ✅ Real-time status tracking
- ✅ Order history management
- ✅ Delivery address management
- ✅ Special instructions support
- ✅ RabbitMQ event publishing (order.placed)
- ✅ Automatic cart expiry

#### Dependencies:
- MongoDB (order data)
- Redis (cart storage)
- RabbitMQ (event publishing)

#### Load Estimate:
- 📊 HIGH (peak during meal times)

---

## 🔌 API GATEWAY (Port 8080)

**Technology:** Spring Cloud Gateway (or Zuul)

#### Responsibilities:
- ✅ Route requests to appropriate services
- ✅ JWT token validation
- ✅ Rate limiting
- ✅ Request/response logging
- ✅ CORS handling
- ✅ Service discovery (if using Eureka)

#### Example Routes:
```java
@Bean
public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
    return builder.routes()
        .route("user-service", r -> r
            .path("/api/auth/**", "/api/users/**")
            .uri("http://localhost:8081"))
        
        .route("food-service", r -> r
            .path("/api/restaurants/**", "/api/search/**", "/api/cuisines/**")
            .uri("http://localhost:8082"))
        
        .route("order-service", r -> r
            .path("/api/cart/**", "/api/orders/**")
            .uri("http://localhost:8083"))
        
        .build();
}
```

---

## 🗄️ Data Persistence Layer

### MySQL (User Service)
```yaml
Port: 3306
Database: foodiehub
Purpose: User accounts, auth data (ACID compliance needed)
Why: Structured data, transactional integrity
```

### MongoDB (Food & Order Services)
```yaml
Port: 27017
Databases: 
  - foodiehub_restaurants (food service)
  - foodiehub_orders (order service)
Purpose: Flexible schema for restaurant data and orders
Why: Document-oriented, scalable, natural for this data
```

### Redis (Caching Layer)
```yaml
Port: 6379
Databases (9 total):
  0: Session tokens (JWT) - TTL: 24h
  1: Refresh tokens - TTL: 7 days
  2: Cart data - TTL: 2h
  3: Restaurant list cache - TTL: 10 min
  4: User preferences cache - TTL: 1h
  5: Rate limiting counters - TTL: 1 min
  6: Search suggestions - TTL: 24h
  7: Order status cache - TTL: 5 min
  8: Reserved for future use

Why: Speed, temporary data, automatic expiry (TTL)
```

### RabbitMQ (Message Broker)
```yaml
Port: 5672
Management UI: 15672 (guest/guest)

Exchanges:
  - foodiehub-events (fanout)

Queues:
  - order.placed → Triggers notifications
  - user.registered → Welcome email
  - order.delivered → Delivery confirmation

Why: Decouple services, async communication, reliability
```

---

## 📤 Data Flow Examples

### Example 1: User Registration Flow
```
Frontend (Angular)
    │
    ├─POST /api/auth/register
    │
    ▼
API Gateway (8080)
    │
    ├─Route to User Service
    │
    ▼
User Service (8081)
    │
    ├─Validate input
    ├─Hash password
    ├─Save to MySQL
    ├─Create JWT token
    ├─Cache in Redis
    │
    ▼
Return JWT to Frontend
```

### Example 2: Browse Restaurants Flow
```
Frontend (Angular)
    │
    ├─GET /api/restaurants?cuisine=Indian
    │
    ▼
API Gateway (8080)
    │
    ├─Route to Food Service
    │
    ▼
Food Service (8082)
    │
    ├─Check Redis cache (hit? return)
    ├─Query MongoDB
    ├─Cache results in Redis (10 min)
    │
    ▼
Return restaurant list to Frontend
```

### Example 3: Place Order Flow
```
Frontend (Angular)
    │
    ├─POST /api/orders (with JWT token)
    │
    ▼
API Gateway (8080)
    │
    ├─Validate JWT
    ├─Route to Order Service
    │
    ▼
Order Service (8083)
    │
    ├─Get cart from Redis
    ├─Validate items
    ├─Save order to MongoDB
    ├─Clear Redis cart
    ├─Publish "order.placed" to RabbitMQ
    │
    ▼
RabbitMQ distributes event
    │
    ├─→ Notification Service (sends email/SMS - future)
    ├─→ Analytics Service (logs order - future)
    │
    ▼
Return order confirmation to Frontend
```

---

## 🚀 Implementation Roadmap

### Phase 1: Setup & Foundation (Week 1)
- [ ] Docker Compose with all infrastructure
- [ ] API Gateway structure
- [ ] Project templates for all 3 services

### Phase 2: User Service (Week 1)
- [ ] User entity & MySQL schema
- [ ] Register & Login endpoints
- [ ] JWT token generation
- [ ] Redis session caching
- [ ] Google OAuth integration
- [ ] Password validation & reset

### Phase 3: Food Service (Week 2)
- [ ] Restaurant & Menu MongoDB schema
- [ ] Restaurant listing API
- [ ] Search & filtering
- [ ] Redis caching
- [ ] Rating system
- [ ] Seed sample data

### Phase 4: Order Service (Week 3)
- [ ] Cart in Redis
- [ ] Order MongoDB schema
- [ ] Place order API
- [ ] Order history
- [ ] RabbitMQ event publishing
- [ ] Status tracking

### Phase 5: Frontend Integration (Week 4)
- [ ] Wire Angular pages to real APIs
- [ ] Handle authentication
- [ ] Real-time updates
- [ ] Error handling

### Phase 6: Deployment & Polish
- [ ] Docker builds for each service
- [ ] Deploy to Railway
- [ ] Testing
- [ ] Documentation

---

## 🔐 Security Considerations

Each service must:
- ✅ Validate JWT tokens from API Gateway
- ✅ Implement role-based access control
- ✅ Validate all input data
- ✅ Use HTTPS in production
- ✅ Implement rate limiting
- ✅ Log all errors
- ✅ Use environment variables for secrets

---

## 📊 Scalability Notes

### High Traffic Scenarios:
- **Food Service:** Scale horizontally (read-heavy, stateless)
- **Order Service:** Use message queues to handle peak loads
- **User Service:** Session persistence in Redis handles scale
- **Database:** Add read replicas as traffic grows

### Caching Strategy:
- Restaurant data cached 10 min
- User preferences cached 1 hour
- Cart expires naturally after 2 hours
- Order status cached 5 minutes

---

## 🎯 Key Metrics to Track

For each service monitor:
- Response time (p95, p99)
- Error rate
- Throughput (requests/sec)
- Database query time
- Cache hit rate
- Queue depth (RabbitMQ)

---

## ✅ Summary: Your Microservices

| Service | Port | Database | Purpose | Load | Status |
|---------|------|----------|---------|------|--------|
| API Gateway | 8080 | - | Routing & Auth | Medium | 🔲 Create |
| User Service | 8081 | MySQL | Auth & Profiles | Medium | ✅ Have (use auth folder) |
| Food Service | 8082 | MongoDB | Restaurants & Menus | HIGH | 🔲 Create |
| Order Service | 8083 | MongoDB | Orders & Cart | HIGH | 🔲 Create |

---

**Next Step:** Would you like me to:
1. Create the Food Service scaffold?
2. Create the Order Service scaffold?
3. Convert foodieHub folder to API Gateway?
4. Set up Docker Compose for all services?

