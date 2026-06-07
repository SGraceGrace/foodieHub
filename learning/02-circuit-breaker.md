# Circuit Breaker

## What is it?
A safety switch between services. If service B keeps failing, the circuit "opens" — calls to B are stopped immediately and a fallback is returned instead of waiting for timeouts. After a cooldown, it tries again ("half-open").

## Why it matters
Without a circuit breaker, one slow/down service causes all upstream threads to block waiting for it. This cascades — eventually the whole system is stuck. Netflix had this exact problem and invented Hystrix (now Resilience4j).

## States
```
CLOSED (normal) → too many failures → OPEN (fail fast)
                                          ↓
                              after timeout → HALF-OPEN (try a few requests)
                                          ↓
                         success → CLOSED again | failure → OPEN again
```

## How it works in FoodieHub
```
Client → API Gateway → CircuitBreaker filter → Microservice
                              ↓ (if circuit is OPEN)
                        FallbackController → 503 JSON
```

Without circuit breaker: user waits 30 seconds then gets a 500.
With circuit breaker: user gets a clear 503 in milliseconds.

## Implementation — Spring Cloud Gateway + Resilience4j

### 1. Dependency (pom.xml)
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-circuitbreaker-resilience4j</artifactId>
</dependency>
```

### 2. Filter on each route (application.yaml)
```yaml
- id: food-service-restaurants
  uri: http://localhost:8082
  predicates:
    - Path=/api/v1/restaurants/**
  filters:
    - name: CircuitBreaker
      args:
        name: food-service              # matches the instance name below
        fallbackUri: forward:/fallback/food-service
```
The `fallbackUri: forward:` sends the request to a local Spring MVC controller inside the gateway — no external call.

### 3. Circuit breaker configuration
```yaml
resilience4j:
  circuitbreaker:
    instances:
      food-service:
        sliding-window-size: 10                      # track last 10 calls
        failure-rate-threshold: 50                   # open if ≥50% fail
        wait-duration-in-open-state: 10s             # stay open for 10s
        permitted-number-of-calls-in-half-open-state: 3   # test with 3 calls
        register-health-indicator: true              # visible in /actuator/health
```

### 4. Fallback controller (FallbackController.java)
```java
@RequestMapping("/fallback/food-service")
public ResponseEntity<Map<String, Object>> foodServiceFallback() {
    return ResponseEntity.status(503).body(Map.of(
        "status", 503,
        "error", "Service Unavailable",
        "message", "Restaurant data is temporarily unavailable."
    ));
}
```

### 5. Health endpoint — see circuit state live
```
GET http://localhost:8080/actuator/health

{
  "components": {
    "circuitBreakers": {
      "details": {
        "food-service": { "status": "UP", "state": "CLOSED" },
        "order-service": { "status": "UP", "state": "CLOSED" }
      }
    }
  }
}
```
When a service goes down, `"state"` flips to `"OPEN"` here — you can see it in real time.

## What triggers the circuit to open?
Any exception thrown while calling the downstream service:
- `ConnectException` — service is down (port refused)
- `SocketTimeoutException` — service is too slow
- Any 5xx response the gateway receives back

## Configuration explained
| Setting | Value | Meaning |
|---|---|---|
| `sliding-window-size` | 10 | Evaluate last 10 calls — not a full minute, just a rolling count |
| `failure-rate-threshold` | 50 | Open when 5 out of last 10 calls fail |
| `wait-duration-in-open-state` | 10s | Don't hammer a struggling service — wait 10s before retrying |
| `permitted-number-of-calls-in-half-open-state` | 3 | Send 3 test calls; if they pass → CLOSED, if they fail → OPEN again |

## Interview talking points
- "I added circuit breakers at the gateway so a single down service can't cascade failures to the whole system — all 4 services are protected in one place"
- "If food-service goes down, the circuit opens and users immediately get a 503 instead of a 30-second timeout — the gateway itself stays healthy"
- "I can see each circuit's state live at `/actuator/health` — useful for debugging in a real on-call situation"
- "The sliding window tracks the last 10 calls — not time-based, so even a burst of failures triggers it immediately"
- "In half-open state, only 3 test requests go through — this prevents thundering herd when a service restarts"
