# Distributed Tracing

## What is it?
Tracking a single request as it flows across multiple microservices. Every request gets a unique Trace ID. Each service adds a Span (its piece of work) to the trace. You can visualise the full call chain and see exactly where time is spent.

## Why it matters
Without tracing, debugging a slow request across 3 services means grepping logs in each service and manually correlating them by timestamp — painful and error-prone. With tracing, you open Zipkin and see the full call chain in one view.

## How it works
```
User → API Gateway → Food Service → MongoDB
         |               |
    Span: 2ms       Span: 45ms
         └───────────────┘
              Trace ID: abc-123
```

Each service:
1. Receives the trace ID in the request header (`traceparent` or `X-B3-TraceId`)
2. Creates a child span for its work
3. Passes the trace ID to any downstream call
4. Reports the span to Zipkin

## Implementation with Micrometer + Zipkin (Spring Boot 3.x)

Spring Boot 3.x uses Micrometer Tracing (replaces Spring Cloud Sleuth from Boot 2.x).

```xml
<!-- Add to each service's pom.xml -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
<dependency>
    <groupId>io.zipkin.reporter2</groupId>
    <artifactId>zipkin-reporter-brave</artifactId>
</dependency>
```

```yaml
# application.yaml in each service
management:
  tracing:
    sampling:
      probability: 1.0   # trace 100% of requests (use 0.1 in production)
  zipkin:
    tracing:
      endpoint: http://localhost:9411/api/v2/spans
```

Run Zipkin:
```bash
docker run -d --name zipkin -p 9411:9411 openzipkin/zipkin
```

Open `http://localhost:9411` → search by service or trace ID → see full call chain with timing.

## What you see in Zipkin
```
Trace: abc-123  (total: 89ms)
├── api-gateway          [2ms]   routing
├── food-service         [52ms]  getRestaurantById
│   └── mongodb          [48ms]  findById query
└── notification-service [35ms]  sendSSE
```

Immediately obvious: MongoDB query is slow — add an index.

## Trace ID in logs
Micrometer automatically adds trace ID to every log line:
```
2026-05-30 10:15:32 INFO  [food-service,abc-123,def-456] RestaurantService - Found restaurant
                           └──service──┘ └trace┘ └span─┘
```

Now you can grep all logs across all services by trace ID and get the complete picture.

## Interview talking points
- "Every request through the API Gateway gets a trace ID. Micrometer propagates it via headers to each downstream service. I can open Zipkin, paste a trace ID, and see the full call chain with timing — no manual log correlation"
- "Distributed tracing helped me find a MongoDB query that was taking 200ms on the restaurant listing. I added a compound index and it dropped to 5ms — visible immediately in the Zipkin waterfall view"
- "In production I'd sample 10% of requests — tracing every request generates too much data. For debugging, I temporarily bump it to 100%"

## What to implement in FoodieHub
- [ ] Add Micrometer + Zipkin dependencies to all services (api-gateway, food-service, order-service, notification-service)
- [ ] Add `management.tracing` config to each `application.yaml`
- [ ] Run Zipkin in Docker
- [ ] Make a request and find it in Zipkin UI
- [ ] Screenshot the trace waterfall for your portfolio/README
