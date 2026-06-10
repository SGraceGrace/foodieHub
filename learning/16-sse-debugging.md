# 16 — SSE Debugging: From 503 to Working Stream

> **Real debugging session** — customer notification SSE stream was returning 503.  
> Three separate problems were found and fixed, each hiding the next one.

---

## What is Content-Type?

**Content-Type tells the receiver "what kind of data am I sending you."**

Think of it like a label on a package:

```
Content-Type: application/json       → "this is JSON data"
Content-Type: text/html              → "this is an HTML page"
Content-Type: text/event-stream      → "this is a live stream of events"
Content-Type: multipart/form-data    → "this is a file upload"
```

It appears in two places:

**Request** — client tells the server what it is sending:
```
POST /api/orders
Content-Type: application/json       ← "my body is JSON"

{ "restaurantId": "abc", "items": [...] }
```

**Response** — server tells the client what it is sending back:
```
HTTP/1.1 200 OK
Content-Type: text/event-stream      ← "I am sending you a live stream"
```

### Why `text/event-stream` is special

Every other Content-Type means "here is your data, we are done."

`text/event-stream` means **"stay connected, more data is coming later."** The browser keeps the connection open and listens for events instead of closing it after receiving the response.

---

## What is the Accept Header?

**`Accept` is the client saying "what format I want back."**

`Content-Type` and `Accept` are opposites:

```
Content-Type  →  "here is what I am sending YOU"
Accept        →  "here is what I want YOU to send me"
```

### Example — Angular calling the restaurant list

```
GET /api/v1/restaurants
Accept: application/json        ← "please give me JSON back"
```

Server responds:
```
Content-Type: application/json  ← "ok, here is JSON"
{ "restaurants": [...] }
```

### Example — Angular connecting to SSE

```
GET /api/v1/customer/notifications/stream
Accept: text/event-stream       ← "please give me a live stream"
```

Server responds:
```
Content-Type: text/event-stream ← "ok, staying connected"
: connected
```

### What happens when they don't match

```
GET /api/v1/restaurants
Accept: text/event-stream       ← "I want a live stream"

Server: "I only produce JSON, not a stream"
→ 406 Not Acceptable
```

---

## What is SseAcceptHeaderFilter?

**Spring Cloud Gateway MVC has a problem with SSE Accept headers.**

When Angular's `EventSource` connects, the browser automatically sends:
```
Accept: text/event-stream
```

Spring Cloud Gateway MVC sees this header **before** it even tries to find a matching route. It looks at the Accept header and says:

> "text/event-stream? I don't know how to produce that. **406 Not Acceptable.**"

The request never reaches the notification-service at all.

### What the filter does

It sits in front of the gateway and intercepts the request first:

```
Browser sends:  Accept: text/event-stream
Filter rewrites: Accept: */*          ← "I'll accept anything"
Gateway sees:   Accept: */*  → routes normally → notification-service ✓
```

The notification-service still responds with `Content-Type: text/event-stream` correctly. The filter only changes what the **gateway sees**, not what the client or downstream service does.

### Why curl worked but Angular did not

The curl was sending `Accept: */*` already, so the gateway never rejected it. Angular's `EventSource` API always sends `text/event-stream` — you cannot change that, it is built into the browser. That is why the filter was needed.

```java
// api-gateway/filter/SseAcceptHeaderFilter.java
@Component
@Order(0)
public class SseAcceptHeaderFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
        HttpServletRequest req = (HttpServletRequest) request;
        String accept = req.getHeader("Accept");

        if (MediaType.TEXT_EVENT_STREAM_VALUE.equalsIgnoreCase(accept)) {
            chain.doFilter(new AcceptRewriteWrapper(req), response); // rewrites to */*
        } else {
            chain.doFilter(request, response);
        }
    }
}
```

---

## The Three Problems Found

### Problem 1 — Circuit Breaker Tripped (all 3 endpoints returning 503)

All three customer notification endpoints were returning 503:
- `GET  /api/v1/customer/notifications`
- `POST /api/v1/customer/push-subscription`
- `GET  /api/v1/customer/notifications/stream`

The notification-service itself was UP and healthy. The 503 was coming from the **API Gateway's circuit breaker**.

#### Why all 3 failed together

The gateway had **one shared circuit breaker** (`notification-service`) watching the door for all 3 routes:

```yaml
- id: notification-service-customer
  uri: ${NOTIFICATION_SERVICE_URL:http://localhost:8084}
  predicates:
    - Path=/api/v1/customer/notifications, /api/v1/customer/notifications/**, /api/v1/customer/push-subscription
  filters:
    - name: CircuitBreaker
      args:
        id: notification-service          ← shared with other routes
        fallbackUri: forward:/fallback/notification-service
```

Every time `/stream` timed out, the circuit breaker counted it as a failure. After enough failures (50% of 10 calls), it opened and blocked **all 3 doors** → 503 on everything.

#### Fix — give SSE its own isolated circuit breaker

```yaml
# SSE gets its own route with its own circuit breaker
- id: notification-service-customer-sse
  uri: ${NOTIFICATION_SERVICE_URL:http://localhost:8084}
  predicates:
    - Path=/api/v1/customer/notifications/stream
  filters:
    - name: CircuitBreaker
      args:
        id: notification-service-sse      ← isolated, cannot affect other routes
        fallbackUri: forward:/fallback/notification-service

# Regular endpoints keep their own route
- id: notification-service-customer
  uri: ${NOTIFICATION_SERVICE_URL:http://localhost:8084}
  predicates:
    - Path=/api/v1/customer/notifications, /api/v1/customer/notifications/**, /api/v1/customer/push-subscription
  filters:
    - name: CircuitBreaker
      args:
        id: notification-service
        fallbackUri: forward:/fallback/notification-service
```

```yaml
# SSE circuit breaker — failure-rate-threshold: 100 means it almost never opens
# because SSE disconnects (normal client behaviour) should not be counted as failures
resilience4j:
  circuitbreaker:
    instances:
      notification-service-sse:
        sliding-window-size: 10
        failure-rate-threshold: 100
        wait-duration-in-open-state: 30s
        permitted-number-of-calls-in-half-open-state: 1
```

---

### Problem 2 — SSE Returning 0 Bytes (the real root cause)

After isolating the circuit breaker, the stream endpoint still failed. Testing the notification-service **directly** (bypassing the gateway) showed the same problem:

```bash
curl http://localhost:8084/api/v1/customer/notifications/stream -H "X-User-Id: peter@gmail.com"
# → TCP connection opens, 0 bytes received, times out after 5s
```

The HTTP response never started. Not even the `200 OK` headers were sent.

#### Why Tomcat was silent

Tomcat writes responses to a **buffer** (like a draft). It only sends that draft to the network when:
1. The buffer fills up (8KB), OR
2. Something explicitly flushes it

The `subscribeCustomer()` method created the `SseEmitter` but never called `emitter.send()`. With nothing to write, Tomcat's buffer stayed empty, nothing got flushed, **not even the HTTP 200 headers.**

```java
// BROKEN — nothing is ever sent, Tomcat never flushes
public SseEmitter subscribeCustomer(String userId) {
    SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
    CustomerSession session = new CustomerSession(userId, emitter);
    customerSessions.add(session);

    Runnable remove = () -> customerSessions.remove(session);
    emitter.onCompletion(remove);
    emitter.onTimeout(remove);
    emitter.onError(e -> customerSessions.remove(session));
    return emitter;  // ← Tomcat has nothing to flush, so 0 bytes go out
}
```

SSE works like a phone call — **you must say something first to prove the line is open.**

```
Angular connects
  → notification-service: ....... (silence, never picks up)
  → Angular: hangs up after timeout
```

#### Fix — send an initial event immediately on connect

```java
// FIXED — initial send forces Tomcat to flush HTTP headers to the network
public SseEmitter subscribeCustomer(String userId) {
    SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
    CustomerSession session = new CustomerSession(userId, emitter);
    customerSessions.add(session);

    Runnable remove = () -> customerSessions.remove(session);
    emitter.onCompletion(remove);
    emitter.onTimeout(remove);
    emitter.onError(e -> customerSessions.remove(session));
    try { emitter.send(SseEmitter.event().comment("connected")); } catch (Exception e) { customerSessions.remove(session); }
    return emitter;
}
```

The `comment("connected")` sends `: connected\n\n` — a standard SSE comment line. This:
1. Forces Tomcat to flush the buffer
2. HTTP 200 + `Content-Type: text/event-stream` headers go out to the network
3. The connection is live and ready for real events

The same fix was applied to all four subscribe methods: `subscribe()` (admin), `subscribeRestaurant()`, `subscribeCustomer()`, `subscribeDriver()`.

---

### Problem 3 — Why It Appeared to Work Before

The SSE was always broken (0 bytes), but **silently broken**. Here is what was happening:

**Before** — the gateway had no read timeout on its HTTP client. So when the SSE connection opened and sent 0 bytes, the gateway just... waited. No error, no timeout, no failure. The circuit breaker saw no failures and stayed closed.

The connection looked "open" — Angular's EventSource showed state `OPEN` — but no events would ever arrive. Silently broken.

**What triggered the visible failure** — `SseAcceptHeaderFilter` was added and the api-gateway was restarted. When the gateway restarted, all those open-but-silent SSE connections were **forcibly dropped**. Each dropped connection counted as a failure:

```
Gateway restarts
  → all live SSE connections drop → 5+ failures in sliding window
  → circuit opens → 503 on all 3 endpoints
  → new SSE attempts also fail (0 bytes) → circuit stays open forever
```

The restart was the trigger. The underlying bug (no initial send) meant the circuit could never recover on its own.

---

## Full Picture — All Three Problems Together

```
1. SSE never sent initial event
        ↓
   Tomcat never flushed → 0 bytes → gateway timed out → counted as failure

2. SSE route shared circuit breaker with regular endpoints
        ↓
   SSE failures tripped circuit → ALL 3 endpoints returned 503

3. Gateway was restarted (to add SseAcceptHeaderFilter)
        ↓
   All open SSE connections dropped at once → failure count spiked → circuit opened
   → new SSE connections also failed → circuit could never close
```

---

## Fixes Summary

| Problem | Fix |
|---|---|
| Gateway rejects `Accept: text/event-stream` with 406 | `SseAcceptHeaderFilter` rewrites it to `*/*` before routing |
| SSE 0 bytes — Tomcat never flushes | `emitter.send(event().comment("connected"))` in every subscribe method |
| SSE failures trip circuit for regular endpoints | Give `/stream` its own `notification-service-sse` circuit breaker |

---

## Key Takeaways

- **`Content-Type`** = label on what you are sending
- **`Accept`** = label on what format you want back
- **406** = server cannot produce the format the client asked for
- **503** = circuit breaker is open, service treated as unavailable
- **SSE** requires an initial send to flush the HTTP response headers — without it, Tomcat buffers silently and the client gets 0 bytes
- **Circuit breakers** should be isolated per route type — a broken SSE stream should never block a regular REST endpoint
