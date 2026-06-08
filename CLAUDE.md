# FoodieHub — CLAUDE.md
## Development Guide (Learning + Interview Ready)

> **How to use:** Paste this into any Claude conversation, Claude Code terminal, or Cowork session. Claude will instantly understand your project and help you build without re-explaining anything.

---

## 🎯 Project Goal

**FoodieHub** is a food delivery app — like Swiggy/Zomato — built to:
- Learn microservices architecture hands-on
- Build a portfolio project for international startup interviews
- Demonstrate real-world tech choices (not just tutorials)

Build every feature correctly and completely. No shortcuts. This is a real project.

---

## 👩‍💻 Developer Context

- **Name:** Grace R
- **Learning:** System design, microservices, full stack
- **Target:** Software Engineer roles at startups in Germany, UAE, Singapore, Ireland
- **Frontend:** Angular (HTML prototype already complete)
- **Backend:** Learning Spring Boot
- **Timeline:** ~4 weeks for working app

---

## 🏗️ Architecture — Keep It Simple

```
Angular Frontend
       ↓
Spring Boot API Gateway  (just routing, no Kong needed)
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
| Deploy | Render | Live demo URL for Wellfound profile |

### Database Names (single instance, multiple logical DBs)

| Database | Type | Used by |
|---|---|---|
| `foodiehub` | MySQL | user-service (users, roles, refresh tokens) |
| `foodiehub_food` | MongoDB | food-service (restaurants, menus) + notification-service (admin_notifications, activity_logs) |

> All services share one MySQL instance and one MongoDB instance. Each service connects only to its own collections — no cross-service queries.

### What we're intentionally skipping
- ❌ Eureka / Service Discovery — Docker DNS is enough
- ❌ Spring Cloud Config — .env files are fine
- ❌ Kong API Gateway — Spring Cloud Gateway does the job
- ❌ Resilience4j circuit breakers — not needed at this scale
- ❌ 80% test coverage — just basic happy path tests
- ❌ 6 microservices — 3 is enough to show the pattern

---

## 📦 The 3 Services

### 1. User Service — Port 8081
- **DB:** MySQL
- **What it does:** Register, login, JWT auth, basic profile
- **Redis:** Store JWT session (TTL 24h)

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
- **RabbitMQ:** Publish `order.placed` event — notification service consumes it

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

## 📨 RabbitMQ — Just One Event

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
      MYSQL_DATABASE: foodiehub

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

## 📅 4-Week Build Plan

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
- [ ] Deploy to Render
- [ ] Test the full user journey end to end
- [ ] Add live URL to Wellfound + LinkedIn + GitHub

**Done when:** Someone else can open your URL and place a food order.

---

## 🤖 How to Ask Claude for Help

### Starting a new service
```
"I'm building the food-service for FoodieHub.
Spring Boot 3.x, MongoDB, Java 17.
Create the Restaurant entity, repository, service, and controller.
Include a basic listing endpoint with optional cuisine filter."
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
and displays the restaurant list."
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

## 🔔 Notification Architecture — Mandatory Pattern

> ⚠️ **Every notification feature in this project must follow this exact pattern, no exceptions.**
> Never use `new Notification()` directly in a component. Never skip the service worker.
> The admin push notification is the reference implementation — all other notifications copy it.

### The two-layer stack (both layers are always required)

| Layer | Technology | Purpose |
|---|---|---|
| **SSE** (Server-Sent Events) | `SseEmitter` in notification-service | Real-time update while the tab is open — patches UI state (badge count, order tracker, list) |
| **Web Push (VAPID)** | `WebPushService` + service worker `sw.js` | OS-level browser notification — fires even when the tab is closed |

**Never use only one layer.** SSE alone means no notification when the tab is closed. `new Notification()` in a component is not Web Push — it is a cheap workaround that looks different from a real OS notification and breaks when the tab is not focused.

---

### Backend — what every notification feature needs

#### 1. RabbitMQ event (in the publishing service, e.g. order-service)
```java
// Event class
public class SomethingHappenedEvent { ... }

// Routing key constant in RabbitMQConfig
public static final String SOMETHING_HAPPENED_RKEY = "something.happened";

// Publish after the DB write
rabbitTemplate.convertAndSend(EXCHANGE, SOMETHING_HAPPENED_RKEY, event);
```

#### 2. notification-service — queue + binding (RabbitMQConfig)
```java
public static final String SOMETHING_HAPPENED_QUEUE = "something.happened.queue";
public static final String SOMETHING_HAPPENED_RKEY  = "something.happened";

@Bean public Queue somethingHappenedQueue() { return new Queue(SOMETHING_HAPPENED_QUEUE, true); }

@Bean
public Binding somethingHappenedBinding(Queue somethingHappenedQueue, TopicExchange foodiehubExchange) {
    return BindingBuilder.bind(somethingHappenedQueue).to(foodiehubExchange).with(SOMETHING_HAPPENED_RKEY);
}
// Also add the class mapping in the Jackson2JsonMessageConverter bean
```

#### 3. notification-service — listener (NotificationListener)
```java
@RabbitListener(queues = RabbitMQConfig.SOMETHING_HAPPENED_QUEUE)
public void onSomethingHappened(SomethingHappenedEvent event) {
    // Layer 1 — SSE (patches UI while tab is open)
    sseEmitterService.pushToXxx(event.getTargetId(), dto);

    // Layer 2 — Web Push (OS notification, works tab closed)
    webPushService.sendToXxx(event.getTargetId(), title, body, orderId);
}
```

#### 4. notification-service — push subscription entity + repo
- Mirror `AdminPushSubscription` / `AdminPushSubscriptionRepo`
- Collection name: `xxx_push_subscriptions`
- Key field: the user/entity identifier (userId, restaurantId, etc.)

#### 5. notification-service — controller
- `GET  /api/v1/{context}/notifications/stream` → SSE subscribe
- `POST /api/v1/{context}/push-subscription`    → save Web Push subscription

#### 6. api-gateway — route
Add both paths to `application.yaml` so the gateway proxies them.

---

### Frontend — what every notification feature needs

#### 1. `PushNotificationService` (`core/services/push-notification.service.ts`)
The shared service already exists. Call it with the correct role:
```typescript
// On login / component init — re-subscribe if permission already granted
this.pushService.init('customer');      // or 'admin', or future roles

// When user clicks "Enable alerts"
this.pushService.requestAndSubscribe('customer');
```
- `permission$` observable — subscribe to it to keep the UI button in sync
- `NgZone.run()` is handled inside the service — no need in the component

#### 2. SSE connection (in the persistent component — header, layout, etc.)
```typescript
this.sseController = this.orderService.connectCustomerSSE(token, (update) => {
  this.ngZone.run(() => {
    // Update badge / list / tracker only — do NOT call new Notification() here
    // Web Push from the service worker handles the OS notification
  });
});
```
- Always open SSE in the **header or layout component** so it stays alive across navigation
- Always abort in `ngOnDestroy()`

#### 3. "Enable alerts" button in the UI
```html
<button *ngIf="notifPermission === 'default'" (click)="enableBrowserNotifications()">
  Enable alerts
</button>
<span *ngIf="notifPermission === 'denied'" title="Blocked in browser settings">🔕</span>
```
- `notifPermission` must be driven by `pushService.permission$` (not by a manual `Notification.permission` read)
- The button must disappear after clicking — this only works if `permission$` is subscribed via `NgZone.run()`

#### 4. Service worker (`public/sw.js`)
Already handles all push events for the whole app. The backend controls what the notification says and where clicking it navigates (`url` field in the JSON payload). **Do not modify `sw.js` per feature** — control behaviour from the backend payload:
```json
{ "title": "Restaurant Name", "body": "message text", "url": "/user/orders", "tag": "order-abc123" }
```

---

### Existing implementations (reference these)

| Recipient | SSE endpoint | Push endpoint | Where initiated | Listener method |
|---|---|---|---|---|
| Admin / Super Admin | `/api/v1/admin/notifications/stream` | `/api/v1/admin/push-subscription` | Admin header (via `PushNotificationService`) | `NotificationListener.*` various |
| Restaurant partner | `/api/v1/restaurant/notifications/stream/{restaurantId}` | *(SSE only — partner is always on the tab)* | `PartnerWorkspaceComponent` | `NotificationListener.onOrderPlaced()` |
| Customer | `/api/v1/customer/notifications/stream` | `/api/v1/customer/push-subscription` | `UserHeaderComponent` | `NotificationListener.onOrderStatusUpdated()` |

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

## 🔄 Service Restart Guide

After making code changes, always restart the affected service(s). Changes only take effect after restart.

| What you changed | Restart needed |
|---|---|
| `api-gateway/src/**` or `api-gateway/resources/application.yaml` | **api-gateway** |
| `foodieHub/src/**` (user-service) | **user-service** |
| `food-service/src/**` | **food-service** |
| `notification-service/src/**` | **notification-service** |
| `foodieHub-FE/src/**` (Angular) | Angular dev server auto-reloads — no restart needed |
| `.env` / environment variables | Restart whichever service uses that variable |

**Rule of thumb:** If you touched a `.java` file or `application.yaml` in a service, restart that service. If you touched gateway routes (`api-gateway/resources/application.yaml`), restart the gateway too.

### Running services and ports
| Service | Port | Start command |
|---|---|---|
| api-gateway | 8080 | Run `ApiGatewayApplication` |
| user-service (foodieHub) | 8081 | Run `FoodieHubApplication` |
| food-service | 8082 | Run `FoodServiceApplication` |
| notification-service | 8084 | Run `NotificationServiceApplication` |
| Angular frontend | 4200 | `ng serve` (auto-reloads) |

### Infrastructure (must be running before starting services)
- **Redis** — required by user-service (JWT session, refresh token) and food-service (cache)
- **RabbitMQ** — required by user-service and notification-service
- **MySQL** — required by user-service
- **MongoDB** — required by food-service

---

## ⭐ Rating Architecture

### Design decisions (approved and implemented)
- **One rating per order** — `ratings` is a separate MongoDB collection; each document ties a customer rating to exactly one order. The `orderId` field has a unique index (`@Indexed(unique = true)`) so no duplicate ratings are possible, even under concurrent requests.
- **Avg recalculated from source of truth** — every time a new rating is saved, the restaurant's `rating` and `ratingCount` are recalculated by fetching *all* ratings for that restaurant from the `ratings` collection and averaging them. This is more accurate than a rolling weighted average which drifts if ratings are edited or deleted.
- **auth guard** — `POST /api/v1/restaurants/{id}/rating` requires auth (the API Gateway splits `/api/v1/restaurants` into GET-public + POST-requires-auth). The customer email comes from the `X-User-Id` header injected by the gateway, not the request body.

### Data flow
```
Customer clicks ★ (Orders page)
  → Angular forkJoin:
      ① POST /api/v1/restaurants/{restaurantId}/rating  { rating, orderId }
             food-service checks existsByOrderId → saves Rating doc → recalculates avg → updates restaurant
      ② PATCH /api/orders/{orderId}/rated
             order-service sets rated=true on the Order doc
  → Local allOrders list patched (rated=true) → "Rate Order" button disappears, "⭐ Rated" badge shows
```

### MongoDB collections
| Collection | Owner service | Key fields |
|---|---|---|
| `ratings` | food-service | restaurantId, customerId, orderId (unique), rating, createdAt |
| `restaurants` | food-service | rating (avg), ratingCount (kept in sync after every new rating) |

### What NOT to do
- ❌ Do not store rating as a rolling weighted average — it drifts and can't be verified
- ❌ Do not accept orderId from the customer in a way that lets them rate without a real order — the orderId is validated against the ratings collection only (order-service is not called for verification)
- ❌ Do not skip the `auto-index-creation: true` in food-service `application.yaml` — without it `@Indexed(unique = true)` on `orderId` is never created in MongoDB

---

## ✅ Definition of Done

The project is interview-ready when:
- [ ] All services run with `docker-compose up`
- [ ] You can register, login, browse restaurants, place an order
- [ ] Live URL works (Render deploy)
- [ ] GitHub README has architecture diagram + setup instructions
- [ ] You can explain every technology choice without reading notes
- [ ] You can draw the architecture on a whiteboard from memory

---

*FoodieHub · Developer: Grace R · Learning project for startup interviews*
*Target: Software Engineer roles — Germany, UAE, Singapore, Ireland*
