# Outbox Pattern

## What is it?
A pattern that guarantees a database write and a message publish happen together — either both succeed or neither does. Solves the "dual write" problem.

## The problem it solves
In FoodieHub order-service, before this fix:
```java
orderRepo.save(order);                     // Step 1: save to MongoDB ✅
rabbitTemplate.convertAndSend(..., event); // Step 2: RabbitMQ crashes here ❌
```
Order is created. Restaurant never gets notified. Customer's food never gets made.

## How it works in FoodieHub

### Before (dual write — fragile)
```
placeOrder()
  → save Order to MongoDB
  → publish OrderPlacedEvent directly to RabbitMQ   ← can fail independently
```

### After (outbox — reliable)
```
placeOrder()
  → save Order to MongoDB
  → save OutboxEvent to MongoDB   ← same DB, same reliability

OutboxPoller (every 5 seconds)
  → find all outbox_events where sent=false
  → publish to RabbitMQ
  → mark sent=true
```

Both the Order and the OutboxEvent go to MongoDB. If RabbitMQ is down, the order is still saved and the event sits in MongoDB until RabbitMQ recovers. Nothing is lost.

## MongoDB document (outbox_events collection)
```json
{
  "_id": "abc123",
  "aggregateId": "order-456",
  "eventType": "order.placed",
  "exchange": "foodiehub.exchange",
  "routingKey": "order.placed",
  "payloadClass": "com.project.orderservice.messaging.OrderPlacedEvent",
  "payloadJson": "{\"orderId\":\"order-456\",\"userId\":\"grace@email.com\",...}",
  "sent": false,
  "createdAt": "2026-06-04T10:00:00"
}
```

After the poller runs:
```json
{ "sent": true, "sentAt": "2026-06-04T10:00:03" }
```

## The three files

### 1. OutboxEvent.java — the document
```java
@Document(collection = "outbox_events")
public class OutboxEvent {
    private String aggregateId;   // orderId — for tracing
    private String eventType;     // "order.placed"
    private String exchange;      // RabbitMQ exchange
    private String routingKey;    // "order.placed"
    private String payloadClass;  // fully-qualified class — for deserialization
    private String payloadJson;   // Jackson-serialized event
    @Indexed
    private boolean sent;         // indexed — queried on every poll cycle
    private LocalDateTime sentAt;
}
```

### 2. OrderServiceImpl.placeOrder() — save to outbox, not RabbitMQ
```java
// Before:
rabbitTemplate.convertAndSend(EXCHANGE, ORDER_PLACED_RKEY, event);

// After:
OutboxEvent outbox = new OutboxEvent();
outbox.setAggregateId(saved.getId());
outbox.setEventType("order.placed");
outbox.setExchange(RabbitMQConfig.EXCHANGE);
outbox.setRoutingKey(RabbitMQConfig.ORDER_PLACED_RKEY);
outbox.setPayloadClass(OrderPlacedEvent.class.getName());
outbox.setPayloadJson(objectMapper.writeValueAsString(event));
outbox.setSent(false);
outboxEventRepository.save(outbox);
```

### 3. OutboxPoller.java — delivers to RabbitMQ
```java
@Scheduled(fixedDelay = 5000)   // every 5 seconds
public void processOutbox() {
    List<OutboxEvent> pending = outboxRepo.findBySentFalseOrderByCreatedAtAsc();
    for (OutboxEvent event : pending) {
        Class<?> clazz   = Class.forName(event.getPayloadClass());
        Object   payload = objectMapper.readValue(event.getPayloadJson(), clazz);

        rabbitTemplate.convertAndSend(event.getExchange(), event.getRoutingKey(), payload);

        event.setSent(true);
        event.setSentAt(LocalDateTime.now());
        outboxRepo.save(event);
    }
}
```

## Important: at-least-once delivery
The poller can publish a duplicate if it crashes after `rabbitTemplate.convertAndSend()` but before `outboxRepo.save(event)` (marking sent=true). That event will be published again on the next poll.

This means: **consumers must be idempotent** — the notification-service must handle receiving the same `order.placed` event twice without sending the customer two push notifications.

```
Published ✅ → crash → restart → published again ← consumers must handle this
```

## Why payloadClass is stored as a string
The OutboxPoller is generic — it handles any event type without a big `if/else` block:
```java
Class<?> clazz   = Class.forName(event.getPayloadClass());  // works for any event
Object   payload = objectMapper.readValue(event.getPayloadJson(), clazz);
rabbitTemplate.convertAndSend(exchange, routingKey, payload);
```
New event types just need a new outbox save — the poller handles them automatically.

## In production: Change Streams instead of polling
The 5-second poll adds up to 5 seconds of notification delay. Production systems use MongoDB Change Streams to react to the insert instantly (milliseconds):
```java
// listens to inserts on outbox_events — fires immediately, not every 5 seconds
mongoTemplate.changeStream(OutboxEvent.class).watchCollection("outbox_events")...
```
For this POC, 5-second polling is fine and much simpler to implement.

## Interview talking points
- "The dual write problem — if you save to DB and publish to a queue in two separate steps, one can fail. The outbox pattern writes the event to the same DB as the domain object. A poller reliably delivers it to RabbitMQ"
- "I used polling every 5 seconds for simplicity. In production I'd use MongoDB Change Streams for near-real-time delivery"
- "This gives at-least-once delivery — if the poller crashes between publish and marking sent, the event fires again. So consumers need to be idempotent"
- "The outbox is generic — it stores the payload class name as a string so the poller can handle any event type without knowing about them upfront"
