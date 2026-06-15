# FoodieHub — System Architecture

## Overview

FoodieHub is a food delivery platform built with a microservices architecture. Five Spring Boot services communicate through an API Gateway, with RabbitMQ for async event-driven messaging and Redis for caching and distributed locking.

---

## Architecture Diagram

```
                          ┌─────────────────────────────┐
                          │       Angular Frontend        │
                          │         (Port 4200)           │
                          └──────────────┬───────────────┘
                                         │ HTTP (REST + SSE)
                          ┌──────────────▼───────────────┐
                          │        API Gateway            │
                          │  Spring Cloud Gateway MVC     │
                          │         (Port 8080)           │
                          │                               │
                          │  • JWT validation             │
                          │  • X-User-Id / X-User-Role    │
                          │  • Rate limiting (Redis)      │
                          │  • Circuit breakers           │
                          │  • CORS                       │
                          └──┬──────┬──────┬────────┬────┘
                             │      │      │        │
              ┌──────────────▼─┐ ┌──▼────┐ │ ┌──────▼──────────────┐
              │  User Service  │ │ Food  │ │ │   Order Service      │
              │   (Port 8081)  │ │Service│ │ │    (Port 8083)       │
              │                │ │ 8082  │ │ │                      │
              │ • Register     │ │       │ │ │ • Cart (MongoDB)     │
              │ • Login / JWT  │ │ • REST│ │ │ • Orders (MongoDB)   │
              │ • OAuth2       │ │   LIST│ │ │ • Payments (Razorpay)│
              │ • Refresh      │ │ • Geo │ │ │ • Coupons            │
              │   tokens       │ │ • ES  │ │ │ • Driver earnings    │
              │ • User mgmt    │ │   search│ │ • Outbox pattern     │
              │ • Driver reg   │ │ • Cache│ │                      │
              │ • Partner reg  │ │   (10m)│ │                      │
              └───────┬────────┘ └──┬────┘ │ └──────────┬──────────┘
                      │             │      │             │
              ┌───────▼─────────────▼──────▼─────────────▼──────────┐
              │                Notification Service                   │
              │                    (Port 8084)                        │
              │                                                       │
              │  • SSE (SseEmitter) — real-time while tab is open    │
              │  • Web Push (VAPID) — OS notification, tab closed     │
              │  • Email (SMTP via JavaMail)                          │
              │  • 4 audiences: Admin, Restaurant, Customer, Driver   │
              └───────────────────────────────────────────────────────┘

┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐
│   MySQL 8  │  │ MongoDB 7  │  │  Redis 7   │  │ RabbitMQ 3.x │
│            │  │            │  │            │  │              │
│ foodiehub  │  │foodiehub_  │  │ Sessions   │  │ foodiehub.   │
│ (users,    │  │food (REST, │  │ Cart locks │  │ exchange     │
│ refresh    │  │ orders,    │  │ Rate limits│  │ (topic)      │
│ tokens,    │  │ notifs,    │  │ Idempotency│  │              │
│ roles)     │  │ ratings,   │  │ Cache      │  │ 9 queues     │
│            │  │ wishlist,  │  │            │  │              │
└────────────┘  │ outbox)    │  └────────────┘  └──────────────┘
                └────────────┘
```

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Angular 17+ | Component-based SPA; already built |
| API Gateway | Spring Cloud Gateway MVC | HTTP/1.1 compatible with blocking SSE; fine-grained route control |
| Backend services | Spring Boot 3.x + Java 17 | Industry standard; virtual threads ready; broad ecosystem |
| Auth | JWT (JJWT) + Spring Security | Stateless; easy to inspect in interviews |
| Relational DB | MySQL 8 | Users and refresh tokens are relational and ACID-sensitive |
| Document DB | MongoDB 7 | Restaurants, orders, cart — document-shaped, schema-flexible |
| Cache | Redis 7 | TTL-backed cart, sessions, rate-limit counters, idempotency |
| Messaging | RabbitMQ 3.x | Decouples order events from notification/food/driver updates |
| Search | Elasticsearch | Full-text + autocomplete on restaurant/menu data |
| Payments | Razorpay | HMAC-SHA256 signature verification; widely used in India |
| Containers | Docker + Docker Compose | One-command local setup |
| Deploy | Render | Free tier with blueprint support; live demo URL |

---

## Databases

### MySQL (`foodiehub`)
Owned exclusively by **user-service**.

| Table | Purpose |
|---|---|
| `user` | All user accounts (customers, admins, owners, drivers) |
| `role` | Role definitions (END_USERS, ADMIN, SUPER_ADMIN, etc.) |
| `user_roles` | Join table: user ↔ role (ManyToMany) |
| `refresh_token` | Refresh tokens with expiry (1-to-1 with user session) |
| `driver` | Driver profile fields (vehicle, license, linked userId) |

### MongoDB (`foodiehub_food`)
Shared instance, logically separated by collection. Multiple services write to it but each service owns its own collections.

| Collection | Owner | Key fields |
|---|---|---|
| `restaurants` | food-service | name, cuisine[], rating, ratingCount, menu[], location, geoPoint, status, operatingHours |
| `ratings` | food-service | restaurantId, customerId, orderId (unique index), rating, driverEmail, driverRating |
| `wishlists` | food-service | userId, restaurantId |
| `owner_approvals` | food-service | ownerId, approved |
| `slides` | food-service | imageUrl, link, active |
| `orders` | order-service | userId, restaurantId, items[], status, paymentId, driverEmail, outbox |
| `carts` | order-service | userId, restaurants[]{restaurantId, items[]} |
| `coupons` | order-service | code, discountType, discountValue, minOrderValue, usageLimit, usedCount |
| `outbox_events` | order-service | aggregateId, eventType, payloadJson, sent, createdAt |
| `admin_notifications` | notification-service | type, title, message, read, createdAt |
| `customer_notifications` | notification-service | userId, orderId, message, type |
| `driver_notifications` | notification-service | driverEmail, orderId, message |
| `admin_push_subscriptions` | notification-service | adminEmail, endpoint, keys |
| `customer_push_subscriptions` | notification-service | userId, endpoint, keys |

### Redis
Single instance. Keys are namespaced by function:

| Key pattern | Used by | TTL | Purpose |
|---|---|---|---|
| `session:{username}:{deviceId}` | user-service | 24h | JWT session store; used to validate tokens and enable single-device logout |
| `refresh:{token}` | user-service | 7d | Refresh token backing store |
| `ratelimit:{ip}:{window}` | api-gateway | 1min | Rate limiter counters |
| `restaurants::*` | food-service | 10min | Spring Cache — restaurant listing results (non-geo queries) |
| `lock:order:{userId}` | order-service | 10s | Distributed mutex to prevent duplicate concurrent orders |
| `idempotency:razorpay:{orderId}` | order-service | 24h | Razorpay idempotency — prevents double-order on network retry |
| `cart:{userId}` | (future) | — | Reserved in CLAUDE.md; cart currently stored in MongoDB |

---

## RabbitMQ

**Exchange:** `foodiehub.exchange` (topic type — allows wildcard routing)

| Routing key | Queue(s) | Published by | Consumed by | Purpose |
|---|---|---|---|---|
| `partner.registered` | `partner.registered.queue` | user-service | notification-service | Email admin when a new restaurant owner registers |
| `owner.status` | `owner.status.queue` | user-service | notification-service | Email owner when admin approves/rejects their application |
| `driver.registered` | `driver.registered.queue` | user-service | notification-service | Notify admin of new driver registration |
| `activity.logged` | `activity.logged.queue` | user-service | notification-service | Admin activity log stream |
| `contact.message` | `contact.message.queue` | user-service | notification-service | Forward contact form submissions to admin email |
| `order.placed` | `order.placed.queue` (restaurant) | order-service (via outbox) | notification-service | Notify restaurant via SSE + email to customer |
| `order.placed` | `driver.order.placed.queue` | order-service (via outbox) | notification-service | Notify available drivers of new order |
| `order.status.updated` | `order.status.updated.queue` | order-service | notification-service | SSE + push to customer on every status change |
| `order.cancelled` | `order.cancelled.queue` | order-service | notification-service | Trigger refund email for paid cancelled orders |

The `order.placed` routing key has **two separate queues** both bound to it. RabbitMQ delivers one copy of each message to every bound queue independently — the restaurant queue and driver queue both receive the same event without competing.

---

## Service Communication

Services do **not** call each other directly over HTTP (no service-to-service REST). All cross-service communication flows through:

1. **RabbitMQ** — asynchronous events (order lifecycle, registrations)
2. **Gateway-injected headers** — the gateway validates JWT and injects `X-User-Id` and `X-User-Role` into every downstream request; downstream services read these headers instead of re-parsing JWT

The only exception is notification-service, which makes one HTTP call to user-service (`/api/v1/user/{email}`) to look up admin user details for email delivery.

---

## Port Reference

| Service | Port |
|---|---|
| api-gateway | 8080 |
| user-service | 8081 |
| food-service | 8082 |
| order-service | 8083 |
| notification-service | 8084 |
| Angular frontend | 4200 |
| MySQL | 3306 |
| MongoDB | 27017 |
| Redis | 6379 |
| RabbitMQ AMQP | 5672 |
| RabbitMQ Management UI | 15672 |
| Elasticsearch | 9200 |
