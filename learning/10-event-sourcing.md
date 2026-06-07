# Event Sourcing

## What is it?
Instead of storing the current state of an entity, you store the full sequence of events that led to that state. The current state is derived by replaying all events from the beginning.

```
Traditional:  orders table → { status: "DELIVERED" }
Event Sourced: order_events table → [
  { type: "ORDER_PLACED",    at: 10:00 }
  { type: "ORDER_CONFIRMED", at: 10:05 }
  { type: "ORDER_PREPARING", at: 10:12 }
  { type: "ORDER_DELIVERED", at: 10:45 }
]
```

## Why it matters
- **Full audit trail** — you know every state change, who triggered it, and when. Regulators love this.
- **Time travel** — replay events up to any point in time to see what the state was then
- **Event replay** — rebuild a read model from scratch by replaying all events (useful after bugs)
- **Debugging** — "how did the order end up in this weird state?" is answerable

## How it relates to CQRS
Event Sourcing and CQRS are often used together but are independent concepts:
- **CQRS** — separate read and write models (already done in FoodieHub: MongoDB write + ES read)
- **Event Sourcing** — the write model stores events, not current state

```
Write side:  save OrderPlacedEvent, OrderConfirmedEvent → event store
Read side:   project events into a denormalised view for fast queries
```

## The problem it solves in a food delivery context
```
Customer complains: "My order showed CONFIRMED then jumped to CANCELLED — what happened?"

Traditional DB: current status = CANCELLED. History? Gone.
Event Sourced:  replay events → see PLACED → CONFIRMED → restaurant_cancelled_event at 10:23
                → immediately know the restaurant cancelled it, not a system bug
```

## How FoodieHub partially has this already
The outbox pattern stores `order.placed` events. RabbitMQ carries status change events. But these are fire-and-forget — they're not stored as the source of truth. True event sourcing means the event log IS the database.

## Full event sourcing would look like this in FoodieHub

### Event store (MongoDB collection: `order_events`)
```json
{ "orderId": "abc", "type": "ORDER_PLACED",    "payload": { ... }, "at": "10:00" }
{ "orderId": "abc", "type": "ORDER_CONFIRMED", "payload": { ... }, "at": "10:05" }
{ "orderId": "abc", "type": "ORDER_CANCELLED", "payload": { ... }, "at": "10:23" }
```

### Derive current state by replaying
```java
List<OrderEvent> events = eventRepo.findByOrderIdOrderByAt("abc");
Order order = new Order();
events.forEach(order::apply);   // each event mutates state
// order.getStatus() == "CANCELLED"
```

### Projection (read model kept in sync)
```
New event saved → project it into the orders read collection
                → ES search index
                → customer notification
```

## Trade-offs

| Pro | Con |
|---|---|
| Full audit trail | Query complexity — can't just `SELECT * FROM orders WHERE status = 'PLACED'` |
| Time travel / replay | Storage grows indefinitely — need snapshotting |
| Natural fit with event-driven systems | Steep learning curve |
| Easy to add new projections later | Eventual consistency between event store and read models |

## Snapshotting (for performance)
Replaying 10,000 events every time is slow. Snapshots solve this:
```
Every 100 events → save a snapshot of the current state
On read → load latest snapshot + replay only events after it
```

## Interview talking points
- "Event sourcing stores state as a sequence of events rather than a mutable record. The current state is derived by replaying events — so you get a full audit trail for free"
- "In a food delivery app this is valuable for disputes — if a customer says their order was cancelled without reason, you can replay the event log and see exactly what triggered the cancellation"
- "FoodieHub uses the Outbox pattern to publish events reliably, but those events are fire-and-forget. True event sourcing would make the event log the source of truth and derive the current state from it"
- "Event sourcing pairs naturally with CQRS — the write side stores events, the read side projects them into whatever shape queries need. They're independent though — you can have CQRS without event sourcing"
- "The main cost is query complexity and storage growth. Snapshotting every N events keeps replay time bounded"

## What to implement in FoodieHub
- [ ] Not needed for POC — conceptual understanding is enough for interviews
- [ ] If implementing: create `order_events` MongoDB collection, store events on every status change, derive `Order` state by replaying
- [ ] Key talking point: FoodieHub's outbox + RabbitMQ is a step toward event sourcing — events are already the communication medium, just not the source of truth yet
