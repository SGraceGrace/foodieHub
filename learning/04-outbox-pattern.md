# Outbox Pattern

## What is it?
A pattern that guarantees a database write and a message publish happen together — either both succeed or neither does. Solves the "dual write" problem.

## The problem it solves
Right now in FoodieHub order-service:
```java
orderRepo.save(order);                          // Step 1: save to MongoDB
rabbitTemplate.convertAndSend(..., event);      // Step 2: publish to RabbitMQ
```
If step 1 succeeds but step 2 fails (RabbitMQ is briefly down, network hiccup), the order is created but no notification fires. The customer sees the order but the restaurant never knows.

## How Outbox solves it
Instead of publishing directly, write the event to an `outbox` collection **in the same DB transaction** as the order. A separate process (poller or Change Stream) reads the outbox and publishes to RabbitMQ, then marks it as sent.

```
Order Service:
  MongoDB transaction:
    1. Save Order document
    2. Save OutboxEvent document { type: "order.placed", payload: {...}, sent: false }

Outbox Processor (separate thread/service):
  Poll outbox for unsent events
    → Publish to RabbitMQ
    → Mark event as sent: true
```

If RabbitMQ is down: order is saved, event sits in outbox. When RabbitMQ comes back, processor publishes it. No lost events.

## MongoDB document for outbox
```json
{
  "_id": "outbox-uuid",
  "eventType": "order.placed",
  "aggregateId": "orderId-123",
  "payload": { "orderId": "...", "userId": "...", "totalAmount": 450 },
  "sent": false,
  "createdAt": "2026-05-30T10:00:00Z"
}
```

## Implementation sketch
```java
// Inside OrderService.placeOrder() — same logical operation
@Transactional   // MongoDB 4+ supports multi-doc transactions on replica set
public Order placeOrder(PlaceOrderRequest req) {
    Order order = orderRepo.save(buildOrder(req));

    OutboxEvent event = new OutboxEvent("order.placed", order.getId(),
                                        buildPayload(order));
    outboxRepo.save(event);   // same session/transaction as order save

    return order;
}

// OutboxPoller.java — scheduled every 5 seconds
@Scheduled(fixedDelay = 5000)
public void processOutbox() {
    List<OutboxEvent> pending = outboxRepo.findBySentFalse();
    for (OutboxEvent event : pending) {
        rabbitTemplate.convertAndSend(EXCHANGE, event.getEventType(), event.getPayload());
        event.setSent(true);
        outboxRepo.save(event);
    }
}
```

## Interview talking points
- "The dual write problem — saving to DB and publishing to a message queue — can leave the system in an inconsistent state if one fails. The Outbox pattern writes the event to the same database as the domain object, so they're atomic. A separate poller reliably delivers to RabbitMQ"
- "This gives at-least-once delivery — the event might be published more than once if the poller crashes after publishing but before marking sent, so consumers must be idempotent"
- "In production you'd use Change Streams on the outbox collection instead of polling for lower latency"

## What to implement in FoodieHub
- [ ] Create `OutboxEvent` MongoDB document + repo in order-service
- [ ] Write event to outbox inside same operation as order save
- [ ] Create `OutboxPoller` with `@Scheduled` to publish and mark sent
- [ ] Add index on `sent: false` for efficient polling query
