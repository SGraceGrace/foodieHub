# Saga Pattern

## What is it?
A way to manage distributed transactions across multiple microservices without a 2-phase commit. Each service does its local transaction and publishes an event. If something fails, compensating transactions undo the previous steps.

## Why 2-phase commit doesn't work in microservices
2PC requires all services to lock resources and coordinate — this creates tight coupling, blocks resources, and fails if any node goes down. Not practical across independent microservices.

## Two types of Saga

### Choreography (event-driven, no central coordinator)
Each service listens for events and reacts. No one service is in charge.

```
Order Service     → publishes order.placed
  ↓
Payment Service   → listens, charges card → publishes payment.success
  ↓
Restaurant        → listens, confirms order → publishes order.confirmed
  ↓
Notification      → listens, notifies user
```

If payment fails:
```
Payment Service → publishes payment.failed
  ↓
Order Service → listens, cancels order → publishes order.cancelled
  ↓
Notification → notifies user "payment failed"
```

### Orchestration (central saga orchestrator tells each service what to do)
A Saga Orchestrator sends commands to each service in sequence and handles failures.

```
Saga Orchestrator
  → tells Order Service: create order
  → tells Payment Service: charge card
  → if fail: tells Order Service: cancel order
  → tells Restaurant: confirm order
  → tells Notification: send confirmation
```

## Saga in FoodieHub (Choreography — fits what you already have)

You already have RabbitMQ. Add compensating events:

```
Events to add:
  order.placed       → already exists
  payment.success    → Payment service publishes after charge
  payment.failed     → Payment service publishes on failure
  order.confirmed    → Restaurant confirms
  order.cancelled    → Triggered by any failure

Compensating transactions:
  payment.failed  → Order Service cancels order
  order.cancelled → Payment Service refunds (if already charged)
```

## Interview talking points
- "I use the Choreography Saga — each service reacts to events via RabbitMQ. There's no central coordinator, which means no single point of failure"
- "If payment fails, the payment service publishes `payment.failed`, the order service listens and cancels the order. This is a compensating transaction — the inverse of the original action"
- "The downside of choreography is it's hard to see the overall flow — you have to trace events across services. Orchestration makes the flow explicit but adds a coordinator service"
- "Sagas give eventual consistency, not ACID consistency — for a brief moment an order can exist without payment. You handle this with order status (PENDING → CONFIRMED/CANCELLED)"

## What to implement in FoodieHub
- [ ] Add `payment.success` / `payment.failed` events to RabbitMQ config
- [ ] Order status: add `PAYMENT_PENDING` before `CONFIRMED`
- [ ] Order Service listens for `payment.failed` → sets status to `CANCELLED`
- [ ] Add compensating logic for each failure scenario
- [ ] Draw the full event flow as a sequence diagram for your portfolio
