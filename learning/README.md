# System Design Learning — FoodieHub

Concepts implemented or studied through this project, ordered by interview priority.

## Concepts

| # | Topic | File | Status |
|---|---|---|---|
| 1 | Rate Limiting | [01-rate-limiting.md](01-rate-limiting.md) | Done — custom Token Bucket (Lua + Redis), per-user + per-route |
| 2 | Circuit Breaker | [02-circuit-breaker.md](02-circuit-breaker.md) | Done — Resilience4j on all api-gateway routes |
| 3 | Idempotency | [03-idempotency.md](03-idempotency.md) | Done — razorpayOrderId key, 24h TTL, PaymentServiceImpl |
| 4 | Outbox Pattern | [04-outbox-pattern.md](04-outbox-pattern.md) | Done — order-service outbox + poller |
| 5 | Geolocation Search | [05-geolocation-search.md](05-geolocation-search.md) | Done — MongoDB $near |
| 6 | Distributed Locking | [06-distributed-locking.md](06-distributed-locking.md) | Done — Redis SETNX + UUID, placeOrder() |
| 7 | Saga Pattern | [07-saga-pattern.md](07-saga-pattern.md) | Done — order.cancelled event triggers refund compensating transaction |
| 8 | CQRS | [08-cqrs.md](08-cqrs.md) | Done — MongoDB write model + Elasticsearch read model |
| 9 | Distributed Tracing | [09-distributed-tracing.md](09-distributed-tracing.md) | Done — Micrometer + Zipkin wired into all 5 services |

| 10 | Event Sourcing | [10-event-sourcing.md](10-event-sourcing.md) | Conceptual — not implemented |
| 11 | Database Sharding | [11-database-sharding.md](11-database-sharding.md) | Conceptual — not implemented |
| 12 | Cache Invalidation | [12-cache-invalidation.md](12-cache-invalidation.md) | Partial — TTL in use; event-driven invalidation not implemented |
| 13 | Backpressure | [13-backpressure.md](13-backpressure.md) | Partial — circuit breaker done; RabbitMQ prefetch + DLQ not implemented |
| 14 | API Versioning | [14-api-versioning.md](14-api-versioning.md) | Partial — /v1/ prefix in place; order/cart routes missing prefix |
| 15 | Pagination Deep Dive | [15-pagination-deep-dive.md](15-pagination-deep-dive.md) | Done — offset pagination on all list endpoints |

## Already in FoodieHub
- Microservices architecture
- API Gateway (Spring Cloud Gateway)
- Event-driven messaging (RabbitMQ)
- Caching (Redis)
- Full-text search (Elasticsearch)
- Polyglot persistence (MySQL + MongoDB)
- JWT authentication
- Server-Sent Events (real-time notifications)
- Web Push notifications (VAPID)
- Containerisation (Docker)
- CQRS (MongoDB write model + ES read model)

## Interview cheat sheet
When asked "tell me about your system design":
1. Start with the architecture diagram (3 microservices, API gateway)
2. Explain each technology choice and WHY (see CLAUDE.md interview talking points)
3. Pick 2-3 patterns from this list and go deep on one
4. Mention trade-offs — shows senior thinking
