# System Design Learning — FoodieHub

Concepts implemented or studied through this project, ordered by interview priority.

## Concepts

| # | Topic | File | Status |
|---|---|---|---|
| 1 | Rate Limiting | [01-rate-limiting.md](01-rate-limiting.md) | To implement |
| 2 | Circuit Breaker | [02-circuit-breaker.md](02-circuit-breaker.md) | To implement |
| 3 | Idempotency | [03-idempotency.md](03-idempotency.md) | To implement |
| 4 | Outbox Pattern | [04-outbox-pattern.md](04-outbox-pattern.md) | To implement |
| 5 | Geolocation Search | [05-geolocation-search.md](05-geolocation-search.md) | To implement |
| 6 | Distributed Locking | [06-distributed-locking.md](06-distributed-locking.md) | To implement |
| 7 | Saga Pattern | [07-saga-pattern.md](07-saga-pattern.md) | To implement |
| 8 | CQRS | [08-cqrs.md](08-cqrs.md) | Already implemented (MongoDB + ES) |
| 9 | Distributed Tracing | [09-distributed-tracing.md](09-distributed-tracing.md) | To implement |

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
