# Backpressure

## What is it?
A mechanism for a slow consumer to signal to a fast producer to slow down. Without it, the consumer's queue fills up, memory spills, and the system crashes.

```
Without backpressure:
  Order Service publishes 10,000 events/sec
  Notification Service processes 100 events/sec
  → Queue grows by 9,900 events/sec
  → RabbitMQ runs out of memory → crash

With backpressure:
  Notification Service signals "I'm overwhelmed"
  → Order Service slows down publishing
  → Queue stays bounded
```

## The analogy
A garden hose (producer) filling a bucket (consumer). If the hose flows faster than the bucket drains, it overflows. Backpressure = the bucket tells the hose to slow down.

## Where it shows up in FoodieHub

### RabbitMQ consumer — prefetch count
RabbitMQ's `prefetchCount` is the primary backpressure lever:

```java
// Without prefetch — RabbitMQ pushes ALL queued messages at once
// Consumer RAM fills → OOM crash

// With prefetch — consumer only receives N unacknowledged messages at a time
factory.setPrefetchCount(10);  // process max 10 at a time
```

```
Queue: [msg1, msg2, ... msg1000]
Prefetch = 10:
  → RabbitMQ sends msg1–10 to consumer
  → Consumer processes msg1, ACKs it
  → RabbitMQ sends msg11
  → Queue drains safely, consumer never overwhelmed
```

### HTTP — connection pool exhaustion
```
Order Service → calls Food Service (HTTP) → 30 simultaneous slow responses
→ Order Service's HTTP connection pool exhausted
→ New requests queue up → memory grows → crash
```

Fix: set connection pool limits + timeouts so slow downstream services can't exhaust the caller.

### Redis — command pipeline backpressure
If you send thousands of Redis commands without waiting for responses, the Redis client's internal buffer fills up. Fix: batch commands with PIPELINE but limit batch size.

## Backpressure strategies

### 1. Bounded queues + rejection
```
Queue max size = 1000
If queue full → reject new messages (fail fast) rather than buffering forever
Producer gets an error → backs off → retries later
```

### 2. Rate limiting the producer
```
If consumer is slow → producer slows publish rate
→ Prevents queue from growing
```

### 3. Acknowledgement-based flow control (RabbitMQ prefetch)
Consumer only gets the next message after ACKing the previous one. The most common approach in RabbitMQ.

### 4. Circuit breaker (already in FoodieHub)
If downstream is overwhelmed → circuit opens → caller fails fast instead of queuing more requests. This is backpressure at the HTTP layer.

## Configuring RabbitMQ prefetch in FoodieHub

In `notification-service`, the `SimpleRabbitListenerContainerFactory` already exists. Add prefetch:

```java
@Bean
public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
        ConnectionFactory connectionFactory,
        Jackson2JsonMessageConverter messageConverter) {
    SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
    factory.setConnectionFactory(connectionFactory);
    factory.setMessageConverter(messageConverter);
    factory.setPrefetchCount(10);          // ← backpressure: max 10 unacked messages
    factory.setDefaultRequeueRejected(false); // failed messages go to DLQ, not back to queue
    return factory;
}
```

## Dead Letter Queue (DLQ) — what happens to rejected messages
When a consumer fails to process a message (throws an exception), it can:
1. **Requeue** — put it back → risk of infinite retry loop
2. **Reject to DLQ** — move to a dead letter queue for manual inspection

```yaml
# RabbitMQ queue declaration with DLQ
x-dead-letter-exchange: foodiehub.dlx
x-dead-letter-routing-key: order.placed.dead
```

DLQ is important alongside backpressure — when you limit prefetch and a message fails, it needs somewhere to go that isn't the main queue.

## Monitoring backpressure
Signs the system is under backpressure:
- RabbitMQ queue depth growing (visible in management UI at `localhost:15672`)
- Consumer lag increasing
- Memory climbing in the consumer service
- Response times spiking

## Interview talking points
- "Backpressure is how a slow consumer tells a fast producer to slow down. Without it, queues grow unbounded and the system crashes. RabbitMQ's prefetch count is the main lever — the consumer only receives N unacknowledged messages at a time"
- "FoodieHub's circuit breaker on the API Gateway is a form of backpressure at the HTTP layer — if food-service is overwhelmed, the circuit opens and new requests fail fast instead of piling up"
- "I'd set prefetchCount to 10 on the notification-service listener — it processes emails and push notifications which can be slow. Without prefetch, a burst of 10,000 orders could dump all events into the consumer at once"
- "A Dead Letter Queue is the companion to backpressure — when you reject a message that can't be processed, it needs somewhere safe to go for manual inspection rather than disappearing or looping forever"

## What to implement in FoodieHub
- [ ] Add `factory.setPrefetchCount(10)` to `SimpleRabbitListenerContainerFactory` in notification-service
- [ ] Set up a Dead Letter Queue for the `order.placed.queue` and `order.cancelled.queue`
- [ ] Monitor queue depth in RabbitMQ management UI (`localhost:15672`) when running locally
