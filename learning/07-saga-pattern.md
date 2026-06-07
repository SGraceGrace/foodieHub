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

## What was actually implemented in FoodieHub

The learning doc's original plan (payment.failed → cancel order) assumed an async payment flow. FoodieHub uses Razorpay with synchronous verification — if payment fails, the order is never created, so there is nothing to cancel.

The correct Saga for this codebase is the **refund compensating transaction**:

### The Saga: paid order cancelled → initiate refund

```
Restaurant cancels a confirmed order
  OrderService.updateStatus("CANCELLED")
    → status = CANCELLED, order has paymentId (was paid)
    → [existing]  publish order.status.updated → customer notified via SSE + Web Push
    → [NEW SAGA]  publish order.cancelled      → refund handler triggered
          ↓
  NotificationListener.onOrderCancelled()
    → logs: "Saga refund triggered — paymentId=xxx amount=yyy"
    → emails customer: "Your refund of ₹X has been initiated"
    → (in production: razorpayClient.payments.refund(paymentId, options))
```

### Why two events for one cancellation?
`order.status.updated` is for UI — SSE patches the order tracker, Web Push shows the "cancelled" banner. It carries no payment details.

`order.cancelled` is the Saga event — it carries `paymentId` and `totalAmount` specifically so the refund handler has what it needs. Different consumers, different concerns.

### Files changed
| File | Change |
|---|---|
| `order-service/.../messaging/OrderCancelledEvent.java` | New event class |
| `order-service/.../messaging/RabbitMQConfig.java` | Added `ORDER_CANCELLED_RKEY = "order.cancelled"` |
| `order-service/.../service/impl/OrderServiceImpl.java` | `updateStatus()` publishes `order.cancelled` when CANCELLED + paymentId != null |
| `notification-service/.../event/OrderCancelledEvent.java` | Mirror event class |
| `notification-service/.../config/RabbitMQConfig.java` | Queue + binding + class mapping for `order.cancelled` |
| `notification-service/.../listener/NotificationListener.java` | `onOrderCancelled()` — logs refund + emails customer |

### What PAYMENT_PENDING would require
Adding `PAYMENT_PENDING` makes sense only if orders are created BEFORE payment is collected — e.g., COD or bank transfer flows. In the Razorpay flow, the order is only created after signature verification succeeds, so `PAYMENT_PENDING` has no window to exist. Skip it for this POC.

## Interview talking points (updated)
- "I use the Choreography Saga — no central coordinator. Each service reacts to events independently via RabbitMQ"
- "When a paid order is cancelled, two events fire: `order.status.updated` updates the UI (SSE/Web Push), and `order.cancelled` triggers the Saga's compensating transaction — the refund"
- "I kept the two events separate because they have different consumers and different payloads. The refund handler needs the paymentId; the UI notification handler doesn't"
- "The compensating transaction is the inverse of the original action: charge → refund. That's the core of the Saga pattern"
- "Choreography's downside is observability — you can't see the full Saga flow in one place. Distributed Tracing (Zipkin) would help here — you'd trace the order.cancelled event through all its consumers"
