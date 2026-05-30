# Circuit Breaker

## What is it?
A safety switch between services. If service B keeps failing, the circuit "opens" — calls to B are stopped immediately and a fallback is returned instead of waiting for timeouts. After a cooldown, it tries again ("half-open").

## Why it matters
Without a circuit breaker, one slow/down service causes all upstream threads to block waiting for it. This cascades — eventually the whole system is stuck. Netflix had this exact problem and invented Hystrix (now Resilience4j).

## States
```
CLOSED (normal) → too many failures → OPEN (fail fast)
                                          ↓
                              after timeout → HALF-OPEN (try one request)
                                          ↓
                         success → CLOSED again | failure → OPEN again
```

## How it works in FoodieHub
```
API Gateway
    ↓
Circuit Breaker (wraps food-service call)
    ↓ (if food-service is down)
Return fallback: { "message": "Restaurant data temporarily unavailable" }
```

Without circuit breaker: user waits 30 seconds then gets a 500.
With circuit breaker: user gets a friendly fallback in milliseconds.

## Implementation with Resilience4j
```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-circuitbreaker-resilience4j</artifactId>
</dependency>
```

```yaml
# application.yaml
resilience4j:
  circuitbreaker:
    instances:
      food-service:
        slidingWindowSize: 10           # last 10 calls
        failureRateThreshold: 50        # open if 50% fail
        waitDurationInOpenState: 10s    # wait 10s before half-open
        permittedNumberOfCallsInHalfOpenState: 3
```

```java
// In a service or gateway filter
@CircuitBreaker(name = "food-service", fallbackMethod = "restaurantFallback")
public List<Restaurant> getRestaurants() {
    return foodServiceClient.getRestaurants();
}

public List<Restaurant> restaurantFallback(Exception e) {
    return Collections.emptyList(); // or cached data from Redis
}
```

## Interview talking points
- "If food-service goes down, the circuit breaker opens and users get a cached or empty response instead of a 30-second timeout — the order flow still works"
- "I set a 50% failure threshold over a 10-request sliding window, with 10 seconds before retrying — this prevents hammering a struggling service"
- "In the half-open state, only 3 test requests go through — if they succeed the circuit closes, if not it stays open"

## What to implement in FoodieHub
- [ ] Add Resilience4j dependency to api-gateway or order-service
- [ ] Wrap food-service calls (restaurant lookup during order) with circuit breaker
- [ ] Return Redis-cached restaurant data as fallback if available
- [ ] Add `/actuator/circuitbreakers` endpoint to monitor state
