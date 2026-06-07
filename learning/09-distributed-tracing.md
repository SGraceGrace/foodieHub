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
- [x] Add Micrometer + Zipkin dependencies to all services
- [x] Add `management.tracing` config to each `application.yaml`
- [ ] Run Zipkin in Docker, make a request, screenshot the trace waterfall

## What was implemented

### Dependencies added to every service
`micrometer-tracing-bridge-brave` + `zipkin-reporter-brave` added to all 5 services.
`spring-boot-starter-actuator` also added to user-service, food-service, order-service, notification-service (needed for Zipkin auto-configuration to activate). api-gateway already had actuator.

### Config added to every application.yaml
```yaml
management:
  tracing:
    sampling:
      probability: 1.0   # 100% in dev — drop to 0.1 in production
  zipkin:
    tracing:
      endpoint: http://localhost:9411/api/v2/spans
```

### api-gateway note
api-gateway runs Spring Boot 4.0.6 (all others are 3.3.5). The same Micrometer Tracing dependencies are compatible — Micrometer is versioned independently of Spring Boot. The gateway propagates trace IDs in B3 headers when it forwards requests to downstream services.

### How trace propagation works
```
Browser → api-gateway (assigns Trace ID: abc-123)
              ↓  X-B3-TraceId: abc-123 (in request header)
          food-service (reads header, creates child span)
              ↓  X-B3-TraceId: abc-123 (forwarded)
          MongoDB driver (creates child span)

All spans reported to Zipkin → visible as one waterfall
```

### Running Zipkin
```bash
docker run -d --name zipkin -p 9411:9411 openzipkin/zipkin
```
Open: http://localhost:9411

### Log correlation (automatic)
With Micrometer Tracing on the classpath, the trace ID is automatically injected into every log line via MDC:
```
INFO  [food-service,abc-123,def-456] RestaurantService - Found restaurant
       └──service──┘ └trace┘ └span─┘
```
Grep all services by the same trace ID to reconstruct the full request path without Zipkin UI.

#### Why this works without any extra configuration
Spring Boot 3.x automatically rewrites the Logback level pattern when `micrometer-tracing-bridge-brave` is on the classpath:
```
%5p [${spring.application.name},%X{traceId},%X{spanId}]
```
Two conditions must be true — both are already met in FoodieHub:
1. No custom `logback.xml` or `logback-spring.xml` in the service — Spring Boot's default Logback config applies the pattern automatically
2. `spring.application.name` is set — all services have this, so the service name shows correctly

#### Same request across all services — same traceId, different spanId
```
INFO [api-gateway,6e40def3a5b14b1c,1b3d52f8a9c0]  GatewayFilter      - Routing to food-service
INFO [food-service,6e40def3a5b14b1c,4a2f91c3d8e7] RestaurantService  - Found restaurant
INFO [food-service,6e40def3a5b14b1c,4a2f91c3d8e7] RestaurantRepo     - Executing query
```
traceId is the same across the whole chain. spanId is unique per service — each span represents one service's piece of work within the trace.

#### Works even when Zipkin is down
Trace IDs appear in logs regardless of whether Zipkin is running. You can grep across all service logs by the same trace ID and reconstruct the full journey without the UI:
```bash
grep "6e40def3a5b14b1c" user-service.log food-service.log order-service.log notification-service.log
```

## Interview talking points (updated)
- "Every request through the gateway gets a Trace ID. Micrometer propagates it in B3 headers to each downstream service. I can paste the ID into Zipkin and see the full call chain with timing — no manual log grepping across 4 services"
- "The gateway is on Spring Boot 4.0 and the microservices on 3.3 — Micrometer Tracing is versioned separately so the same dependencies work across both without compatibility issues"
- "In production I'd sample 10% — `sampling.probability: 0.1`. For debugging a specific issue I temporarily bump to 1.0 to capture every request"
- "Trace IDs appear in logs automatically via MDC. Even without Zipkin running, I can grep all service logs by the same trace ID and reconstruct the full flow"
