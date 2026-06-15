# FoodieHub — Technical Documentation

Detailed internal documentation covering every service, design decision, data flow, and infrastructure concern.

---

## Documents

| Document | What it covers |
|---|---|
| [system-architecture.md](system-architecture.md) | Architecture diagram, tech stack rationale, database breakdown, RabbitMQ event table, port reference |
| [api-gateway.md](api-gateway.md) | Filter pipeline, JWT validation, public vs protected paths, rate limiting, SSE support, routing table, circuit breakers, CORS |
| [user-service.md](user-service.md) | MySQL schema, role system, local login flow, JWT structure, Google OAuth2 flow, Redis session store, refresh token rotation, RabbitMQ events published, API reference |
| [food-service.md](food-service.md) | MongoDB restaurant schema, geo-spatial queries, Redis caching strategy, Elasticsearch integration, rating calculation, operating hours logic, API reference |
| [order-service.md](order-service.md) | Cart document, Razorpay 3-step payment flow, HMAC signature verification, idempotency, distributed lock, bill calculation, order lifecycle, outbox pattern, driver flow, earnings dashboard, API reference |
| [notification-service.md](notification-service.md) | SSE vs Web Push (VAPID), SseEmitterService session management, push subscription flow, RabbitMQ consumers, email sending, MongoDB collections, API reference |
| [security-design.md](security-design.md) | Gateway-as-auth-boundary pattern, HeaderAuthFilter, role definitions, public path matrix, JWT security details, BCrypt, CORS, rate limiting, Razorpay payment security |
| [data-flows.md](data-flows.md) | Step-by-step traces: login, browse restaurants, place order with payment, order status update with SSE+push, Google OAuth2 login, token refresh |
| [infrastructure.md](infrastructure.md) | Local setup steps, all environment variables with defaults, Docker Compose, Render deployment, MySQL/MongoDB/Redis/RabbitMQ/Elasticsearch details, Zipkin tracing |

---

## Quick Reference

### Service ports

```
Angular frontend      4200
API Gateway           8080
User Service          8081
Food Service          8082
Order Service         8083
Notification Service  8084
```

### Admin credentials (development)

```
Email:    admin@foodiehub.com
Password: Admin@123
```

### Infrastructure (Docker)

```bash
docker compose up mysql mongodb redis rabbitmq elasticsearch -d
```

### Key design decisions at a glance

| Decision | Why |
|---|---|
| MySQL for users | ACID guarantees; relational join between users and roles |
| MongoDB for restaurants/orders | Document-shaped data; embedded menus avoid joins |
| Redis for sessions | Revocable JWTs; TTL-backed cart; distributed locking |
| RabbitMQ for order events | Decouples order placement from notification delivery |
| Outbox pattern for order.placed | Guarantees event delivery even if RabbitMQ is briefly down |
| Gateway as auth boundary | Single JWT validation point; downstream services read headers |
| SSE + Web Push (both) | SSE for in-page updates; Web Push for OS notifications when tab is closed |
| Rating recalculated from all records | Avoids drift from rolling averages; accurate after edits/deletes |
| Razorpay idempotency via Redis | Prevents double-order on network retry after payment |
| OAuth2 circuit breaker isolation | Prevents OAuth2 failures from tripping API route circuit breaker |
