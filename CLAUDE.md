# FoodieHub — CLAUDE.md
## POC Development Guide (Learning + Interview Ready)

> **How to use:** Paste this into any Claude conversation, Claude Code terminal, or Cowork session. Claude will instantly understand your project and help you build without re-explaining anything.

---

## 🎯 Project Goal

**FoodieHub** is a food delivery POC — like a simplified Swiggy/Zomato — built to:
- Learn microservices architecture hands-on
- Build a portfolio project for international startup interviews
- Demonstrate real-world tech choices (not just tutorials)

**This is NOT an enterprise app.** Keep it simple, keep it working, keep it deployable.

---

## 👩‍💻 Developer Context

- **Name:** Grace R
- **Learning:** System design, microservices, full stack
- **Target:** Software Engineer roles at startups in Germany, UAE, Singapore, Ireland
- **Frontend:** Angular (HTML prototype already complete)
- **Backend:** Learning Spring Boot
- **Timeline:** ~4 weeks for working POC

---

## 🏗️ Architecture — Keep It Simple

```
Angular Frontend
       ↓
Spring Boot API Gateway  (just routing, no Kong needed for POC)
       ↓
┌──────────────┬───────────────┬──────────────┐
│ User Service │ Food Service  │ Order Service │
│   MySQL      │   MongoDB     │   MongoDB    │
└──────────────┴───────────────┴──────────────┘
        ↓                            ↓
      Redis                      RabbitMQ
  (cart, sessions)            (order events)
```

**3 microservices. That's it.** This is enough to demonstrate the pattern clearly in any interview.

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Angular 17+ | Already designed, just wire to APIs |
| Backend | Spring Boot 3.x + Java 17 | Industry standard, great for interviews |
| API Gateway | Spring Cloud Gateway | Simple routing, no complex Kong setup |
| Auth | JWT + Spring Security | Standard, good to explain in interviews |
| Relational DB | MySQL 8 | Users + payments (structured data) |
| Document DB | MongoDB | Restaurants + orders (flexible schema) |
| Cache | Redis | Cart storage + JWT sessions |
| Messaging | RabbitMQ | Order placed → notification event |
| Containers | Docker + Docker Compose | Run everything locally with one command |
| Deploy | Railway (free) | Live demo URL for Wellfound profile |

### What we're intentionally skipping for POC
- ❌ Eureka / Service Discovery — Docker DNS is enough
- ❌ Spring Cloud Config — .env files are fine
- ❌ Kong API Gateway — Spring Cloud Gateway does the job
- ❌ Resilience4j circuit breakers — not needed for POC
- ❌ 80% test coverage — just basic happy path tests
- ❌ 6 microservices — 3 is enough to show the pattern

---

## 📦 The 3 Services

### 1. User Service — Port 8081
- **DB:** MySQL
- **What it does:** Register, login, JWT auth, basic profile
- **Redis:** Store JWT session (TTL 24h)
- **Keep it simple:** Just auth + profile. No complex address management needed for POC.

**APIs needed:**
```
POST /api/auth/register     → Create account
POST /api/auth/login        → Get JWT token
GET  /api/users/me          → Get my profile (JWT protected)
PUT  /api/users/profile     → Update name, phone
```

**MySQL tables:**
```sql
users (id, name, email, password_hash, phone, role, created_at)
```

---

### 2. Food Service — Port 8082
- **DB:** MongoDB
- **What it does:** Restaurants, menus, categories, search
- **Redis:** Cache restaurant list (TTL 10 min) — good to show in interviews
- **Keep it simple:** Read-heavy service. CRUD for restaurants + menus. No branch management needed.

**APIs needed:**
```
GET  /api/restaurants           → List all restaurants (with filters)
GET  /api/restaurants/:id       → Single restaurant details
GET  /api/restaurants/:id/menu  → Full menu
GET  /api/cuisines              → All cuisine categories
GET  /api/search?q=biryani      → Search dishes + restaurants
```

**MongoDB document:**
```json
{
  "name": "Spice Garden",
  "cuisine": ["Indian"],
  "rating": 4.8,
  "deliveryTime": 25,
  "isOpen": true,
  "menu": [
    {
      "category": "Main Course",
      "items": [
        { "name": "Butter Chicken", "price": 340, "isVeg": false, "available": true }
      ]
    }
  ]
}
```

---

### 3. Order Service — Port 8083
- **DB:** MongoDB
- **What it does:** Place orders, track status, order history
- **Redis:** Cart storage per user (TTL 2h)
- **RabbitMQ:** Publish `order.placed` event — notification service can consume it later
- **Keep it simple:** Basic order lifecycle. No driver assignment, no live tracking for POC.

**APIs needed:**
```
POST /api/cart/add              → Add item to cart
GET  /api/cart                  → Get my cart
DELETE /api/cart/clear          → Clear cart
POST /api/orders                → Place order from cart
GET  /api/orders                → My order history
GET  /api/orders/:id            → Single order details
PUT  /api/orders/:id/status     → Update status (restaurant owner)
```

**MongoDB document:**
```json
{
  "userId": "string",
  "restaurantId": "string",
  "items": [{ "name": "Butter Chicken", "price": 340, "qty": 2 }],
  "status": "PLACED | CONFIRMED | PREPARING | DELIVERED | CANCELLED",
  "totalAmount": 730,
  "deliveryAddress": "42, Gandhi Nagar, Chennai",
  "createdAt": "2025-12-16T14:30:00Z"
}
```

---

## 🗄️ Redis Usage

```
session:{userId}         → JWT token          TTL: 24h
cart:{userId}            → Cart items JSON    TTL: 2h
cache:restaurants        → Restaurant list    TTL: 10min
```

---

## 📨 RabbitMQ — Just One Event for POC

```
When order is placed:
  Order Service → publishes → order.placed → (notification queue)

That's it. One exchange, one event. Enough to demonstrate the concept.
```

---

## 📁 Folder Structure

```
foodiehub/
├── frontend/
│   └── foodiehub-angular/        ← Angular app (prototype done)
│
├── backend/
│   ├── api-gateway/              ← Spring Cloud Gateway
│   ├── user-service/             ← Spring Boot + MySQL
│   ├── food-service/             ← Spring Boot + MongoDB
│   └── order-service/            ← Spring Boot + MongoDB + Redis
│
├── docker-compose.yml            ← Runs everything with one command
└── README.md                     ← Architecture diagram + setup guide
```

---

## 🐳 Docker Compose (run everything locally)

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: foodiehub_users

  mongodb:
    image: mongo:7
    ports: ["27017:27017"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  rabbitmq:
    image: rabbitmq:3-management
    ports: ["5672:5672", "15672:15672"]
    # Management UI at localhost:15672 (guest/guest)

  user-service:
    build: ./backend/user-service
    ports: ["8081:8081"]
    depends_on: [mysql, redis]

  food-service:
    build: ./backend/food-service
    ports: ["8082:8082"]
    depends_on: [mongodb, redis]

  order-service:
    build: ./backend/order-service
    ports: ["8083:8083"]
    depends_on: [mongodb, redis, rabbitmq]

  api-gateway:
    build: ./backend/api-gateway
    ports: ["8080:8080"]
    depends_on: [user-service, food-service, order-service]

  frontend:
    build: ./frontend/foodiehub-angular
    ports: ["4200:80"]
```

---

## 📅 4-Week POC Plan

### Week 1 — User Service + Auth
**Goal:** Login and signup working end-to-end with real database

- [ ] Set up Docker Compose (MySQL, MongoDB, Redis, RabbitMQ all running)
- [ ] Create user-service Spring Boot project
- [ ] User entity + MySQL table
- [ ] Register + Login APIs with JWT
- [ ] Redis session storage
- [ ] Spring Cloud Gateway routing to user-service
- [ ] Angular: Wire login + signup pages to real API

**Done when:** You can register, login, get JWT, and see it in Postman.

---

### Week 2 — Food Service
**Goal:** Browse restaurants and menus from real MongoDB

- [ ] Create food-service Spring Boot project
- [ ] Restaurant + Menu MongoDB schema
- [ ] Restaurant listing API with basic filters
- [ ] Single restaurant + menu API
- [ ] Search API
- [ ] Redis caching for restaurant list
- [ ] Seed some sample restaurant data
- [ ] Angular: Wire home page, restaurant listing, restaurant detail pages

**Done when:** Home page shows real restaurants from MongoDB. Search works.

---

### Week 3 — Order Service + Cart
**Goal:** Full order flow working

- [ ] Create order-service Spring Boot project
- [ ] Cart in Redis (add, get, clear)
- [ ] Order MongoDB schema
- [ ] Place order API (reads cart, creates order, clears cart)
- [ ] Order history API
- [ ] RabbitMQ: Publish `order.placed` event
- [ ] Angular: Wire cart page, checkout, order confirmed, my orders

**Done when:** User can add to cart, checkout, see order in history. RabbitMQ event fires.

---

### Week 4 — Polish + Deploy
**Goal:** Live URL + clean GitHub = interview ready

- [ ] Connect all Angular pages to real APIs
- [ ] Basic error handling in all services
- [ ] Write a good README with architecture diagram
- [ ] Deploy to Railway (free tier)
- [ ] Test the full user journey end to end
- [ ] Add live URL to Wellfound + LinkedIn + GitHub

**Done when:** Someone else can open your URL and place a food order.

---

## 🤖 How to Ask Claude for Help

### Starting a new service
```
"I'm building the food-service for FoodieHub POC.
Spring Boot 3.x, MongoDB, Java 17.
Create the Restaurant entity, repository, service, and controller.
Include a basic listing endpoint with optional cuisine filter.
Keep it simple — this is a learning POC, not enterprise code."
```

### When you're stuck on something
```
"I'm getting this error in my user-service: [paste error]
Here's my code: [paste code]
I'm using Spring Boot 3.x with MySQL and JWT.
What's wrong and how do I fix it?"
```

### Wiring Angular to backend
```
"I have a GET /api/restaurants endpoint running on localhost:8082.
Help me create an Angular service and component that calls this
and displays the restaurant list. Keep it simple."
```

### Understanding what you built
```
"Explain what this code does in simple terms so I can
explain it in an interview: [paste code]"
```

---

## 🎯 Interview Talking Points

These are the questions you'll get — here's what to say:

**"Why microservices?"**
> Each service can be developed and scaled independently. In a real food app, restaurant search gets way more traffic than payment processing — so they need to scale differently.

**"Why MongoDB for restaurants?"**
> Restaurant data is document-shaped — each restaurant has its own menu structure. MongoDB handles this naturally without complex joins.

**"Why MySQL for users?"**
> User and auth data is relational and structured. MySQL's ACID guarantees are important for auth — I don't want partial writes on a user record.

**"Why Redis for the cart?"**
> Cart data is temporary (users abandon carts), high-read, and needs automatic expiry. Redis TTL handles all of this perfectly.

**"Why RabbitMQ instead of direct API calls?"**
> When an order is placed, multiple things need to happen — notification, payment, etc. RabbitMQ decouples these. If the notification service is down, the order still gets placed and the event is queued for retry.

**"Show me the system design."**
> Pull up the architecture diagram from your README and walk through a complete order flow.

---

## 📐 Coding Conventions (Always Follow These)

### Pagination — mandatory for every table
Every API endpoint that returns a list **and** every UI table must be paginated. No exceptions.

**Backend (Spring Boot):**
- Controller accepts `@RequestParam(defaultValue = "0") int page` and `@RequestParam(defaultValue = "10") int size`
- Service receives a `Pageable` (`PageRequest.of(page, size)`)
- Repository uses Spring Data `Page<T>` return types
- Response is always wrapped in `PaginatedResponse<T>` (the shared DTO with `content`, `currentPage`, `totalPages`, `totalElements`, `pageSize`)

**Frontend (Angular):**
- Service method sends `page` and `size` as `HttpParams`
- Return type is `Observable<ApiResponse<PaginatedResponse<T>>>`
- Component holds a `pagination` state object: `{ currentPage, totalPages, totalElements, pageSize }`
- Template renders prev/next page buttons and a "Showing X–Y of Z" info line
- Always assign `p.content ?? []` (never `p.content` directly) to guard against undefined

---

## ✅ Definition of Done (POC)

Your POC is interview-ready when:
- [ ] All 3 services run with `docker-compose up`
- [ ] You can register, login, browse restaurants, place an order
- [ ] Live URL works (Railway deploy)
- [ ] GitHub README has architecture diagram + setup instructions
- [ ] You can explain every technology choice without reading notes
- [ ] You can draw the architecture on a whiteboard from memory

---

*FoodieHub POC · Developer: Grace R · Learning project for startup interviews*
*Target: Software Engineer roles — Germany, UAE, Singapore, Ireland*
