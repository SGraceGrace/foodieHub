# Notification Service

**Port:** 8084  
**Database:** MongoDB (`foodiehub_food`)  
**Tech:** Spring Boot 3.x, Spring AMQP, JavaMail (SMTP), Web Push (VAPID), `SseEmitter`  
**File:** `backend/notification-service`

---

## Responsibilities

- Receive RabbitMQ events from user-service and order-service
- Push real-time updates via SSE (Server-Sent Events) while the browser tab is open
- Push OS-level browser notifications via Web Push (VAPID) when the tab is closed
- Send transactional emails (order confirmation, driver assignment, partner registration, etc.)
- Store notification history in MongoDB for each audience
- Manage VAPID push subscriptions for admins and customers

---

## Two-Layer Notification Stack

Every notification feature uses **both** layers:

| Layer | Technology | When it fires | What the user sees |
|---|---|---|---|
| SSE | `SseEmitter` in Spring MVC | While the browser tab is open | Badge count updates, order tracker ticks to next status, list refreshes |
| Web Push (VAPID) | Browser Push API + service worker | Even when the tab is closed | OS-level notification (looks like a native app notification) |

The two layers are complementary, not alternatives. SSE patches the in-page UI (badges, status trackers) because it has access to the Angular component. Web Push delivers the notification if the tab is closed — it fires from the browser's service worker, which runs independently of the page.

**What NOT to do:** Never call `new Notification()` directly in an Angular component. This is not Web Push — it creates a notification that looks different from a real OS notification, doesn't work when the tab is closed, and gets blocked when the tab is not focused.

---

## Server-Sent Events (SSE)

### How SSE works

SSE is a one-way server-to-client streaming protocol over HTTP/1.1. The browser opens a `GET` request and keeps it open; the server pushes newline-delimited `data:` frames:

```
data: {"type":"ORDER_STATUS","orderId":"abc","status":"CONFIRMED"}\n\n
```

Spring MVC's `SseEmitter` is a handle to this open connection:

```java
SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);  // no timeout
emitter.send(SseEmitter.event().data(dto, MediaType.APPLICATION_JSON));
```

`Long.MAX_VALUE` as timeout means the emitter lives forever (until the client disconnects or the connection drops). The `spring.mvc.async.request-timeout: -1` setting in `application.yaml` prevents the servlet container from closing async requests on a fixed timeout.

### Session management in `SseEmitterService`

Active SSE connections are stored in-memory in `CopyOnWriteArrayList`s — one list per audience:

```java
private final List<AdminSession>      adminSessions      = new CopyOnWriteArrayList<>();
private final List<RestaurantSession> restaurantSessions = new CopyOnWriteArrayList<>();
private final List<CustomerSession>   customerSessions   = new CopyOnWriteArrayList<>();
private final List<DriverSession>     driverSessions     = new CopyOnWriteArrayList<>();
```

`CopyOnWriteArrayList` is used because pushes (reads of the list + emitter writes) happen on the RabbitMQ listener thread while subscriptions/completions (writes to the list) happen on the HTTP request thread. `CopyOnWriteArrayList` is thread-safe for this mix without locking.

When a push fails (emitter is closed because the tab was closed), the dead session is collected and removed from the list:

```java
List<CustomerSession> dead = new ArrayList<>();
for (CustomerSession session : customerSessions) {
    try { session.emitter().send(...); }
    catch (Exception e) { dead.add(session); }
}
customerSessions.removeAll(dead);
```

### SSE connection lifecycle

```
Angular (UserHeaderComponent / AdminHeader):
  1. Call openSSE():
       const source = new EventSource('/api/v1/customer/notifications/stream', { ... });
       source.onmessage = (event) => { /* update badge/tracker */ }

  notification-service SSE controller:
  2. Validate JWT (via @PreAuthorize — HeaderAuthFilter reads X-User-Id)
  3. SseEmitterService.subscribeCustomer(userId) → creates SseEmitter, adds to list
  4. Send initial "connected" comment (keeps connection alive past proxy timeouts)
  5. Return SseEmitter (Spring holds this response open)

  When order status changes (RabbitMQ event arrives):
  6. NotificationListener.onOrderStatusUpdated() → sseEmitterService.pushToCustomer(userId, dto)
  7. Emitter sends JSON frame to browser

  On tab close / navigation:
  8. Browser closes EventSource → server-side emitter fires onCompletion() → session removed
```

### SSE endpoint per audience

| Audience | SSE endpoint | Auth |
|---|---|---|
| Admin / Super Admin | `GET /api/v1/admin/notifications/stream` | ADMIN or SUPER_ADMIN |
| Restaurant partner | `GET /api/v1/restaurant/notifications/stream/{restaurantId}` | RESTAURANT_OWNER |
| Customer | `GET /api/v1/customer/notifications/stream` | END_USERS |
| Driver | `GET /api/v1/driver/notifications/stream` | DRIVER |

---

## Web Push (VAPID)

### What VAPID is

VAPID (Voluntary Application Server Identification) is a protocol that lets a server push notifications to a browser even when the browser has no open connection to the server. The push goes through the browser vendor's push service (FCM for Chrome, Mozilla's service for Firefox).

The flow has three parties:
1. **Application server** (notification-service) — has the VAPID private key
2. **Browser push service** (Google FCM, Mozilla, etc.) — stores the subscription endpoint
3. **Browser service worker** (`sw.js`) — receives the push and shows the OS notification

### VAPID key pair

```yaml
vapid:
  public-key: ${VAPID_PUBLIC_KEY:BBExuSKx28RTr_...}  # Base64url-encoded, shared with frontend
  private-key: ${VAPID_PRIVATE_KEY:Ln6IM4WpM_...}    # Secret, never sent to browser
```

The public key is sent to the browser when it creates a push subscription. The browser uses it to encrypt the push subscription endpoint. Only the holder of the private key (notification-service) can send to that endpoint.

### Subscription flow

```
1. User clicks "Enable alerts" button in Angular
   → pushNotificationService.requestAndSubscribe('customer')

2. Browser API: Notification.requestPermission()
   → User grants permission

3. Browser API: serviceWorkerRegistration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidPublicKey })
   → Browser contacts FCM → gets PushSubscription { endpoint, keys: { p256dh, auth } }

4. Angular: POST /api/v1/customer/push-subscription { endpoint, keys }
   → notification-service saves CustomerPushSubscription to MongoDB

5. (Later) Order status changes:
   → NotificationListener sends via WebPushService.sendToCustomer(userId, title, body, url)
   → WebPushService fetches subscription(s) from MongoDB for userId
   → For each: send HTTP request to endpoint with encrypted payload
   → FCM → Browser service worker → OS notification
```

### Push subscriptions in MongoDB

| Collection | Fields |
|---|---|
| `admin_push_subscriptions` | adminEmail, endpoint, keys.p256dh, keys.auth |
| `customer_push_subscriptions` | userId (email), endpoint, keys.p256dh, keys.auth |

A user can have multiple push subscriptions (different browsers/devices). `WebPushService` fetches all subscriptions for a given userId and pushes to each one.

### Service worker (`public/sw.js`)

The service worker handles all push events for the entire app. It runs independently of any page. The notification-service controls the notification content and click behavior through the push payload JSON:

```json
{
  "title": "Spice Garden",
  "body": "Your order is being prepared!",
  "url": "/user/orders",
  "tag": "order-abc123"
}
```

`tag` deduplicates notifications — if two pushes arrive with the same tag, only the latest is shown.

---

## RabbitMQ Event Consumers

All consumers are in `NotificationListener.java`:

| Queue | Event class | What happens |
|---|---|---|
| `partner.registered.queue` | `PartnerRegisteredEvent` | Email admin: new restaurant owner registered |
| `owner.status.queue` | `OwnerStatusEvent` | Email owner: approved/rejected + SSE to all admins |
| `driver.registered.queue` | `DriverRegisteredEvent` | SSE to admins + email admin |
| `activity.logged.queue` | `ActivityLoggedEvent` | Save to `admin_notifications` + SSE to all admins |
| `contact.message.queue` | `ContactMessageEvent` | Email to admin |
| `order.placed.queue` | `OrderPlacedEvent` | SSE to restaurant + email confirmation to customer |
| `driver.order.placed.queue` | `OrderPlacedEvent` | SSE to available drivers of new order |
| `order.status.updated.queue` | `OrderStatusUpdatedEvent` | SSE + Web Push to customer |
| `order.cancelled.queue` | `OrderCancelledEvent` | Email to customer (refund notification) |

### Jackson deserialization

All events are JSON-serialized by the publishing service. The RabbitMQ `messageConverter` bean in `RabbitMQConfig` uses a `DefaultJackson2JavaTypeMapper` with explicit class ID mappings:

```java
idClassMapping.put(
  "com.project.orderservice.messaging.OrderPlacedEvent",
  OrderPlacedEvent.class  // notification-service local class
);
```

This two-sided mapping (source package → local class) allows the notification-service to have its own copy of the event classes without dependency coupling to the publishing services.

---

## Email Sending

Emails are sent via `JavaMailSender` through Gmail SMTP (configured in `application.yaml`):

```yaml
spring.mail:
  host: smtp.gmail.com
  port: 587
  username: ${MAIL_USERNAME}
  password: ${MAIL_PASSWORD}  # Gmail App Password, not the account password
  properties.mail.smtp.starttls.enable: true
```

Email templates are built with HTML strings in the `EmailService`. They use inline CSS for compatibility with email clients that strip `<style>` tags.

Emails are sent for:
- Order placed confirmation (to customer)
- Order status changes (to customer, for key milestones)
- Partner/driver registration (to admin)
- Owner approved/rejected (to owner)
- Order cancelled with refund info (to customer)
- Contact form submission (to admin)

---

## MongoDB Collections

| Collection | Purpose |
|---|---|
| `admin_notifications` | Admin activity stream (partner registrations, driver registrations, activity logs) |
| `customer_notifications` | Customer notification history (order updates) |
| `driver_notifications` | Driver notification history (new available orders) |
| `admin_push_subscriptions` | VAPID push subscriptions for admins |
| `customer_push_subscriptions` | VAPID push subscriptions for customers |

---

## API Reference

### Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/admin/notifications/stream` | ADMIN | SSE subscribe |
| GET | `/api/v1/admin/notifications` | ADMIN | Paginated notification history |
| PATCH | `/api/v1/admin/notifications/{id}/read` | ADMIN | Mark as read |
| PATCH | `/api/v1/admin/notifications/mark-all-read` | ADMIN | Mark all as read |
| POST | `/api/v1/admin/push-subscription` | ADMIN | Save VAPID push subscription |

### Customer

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/customer/notifications/stream` | END_USERS | SSE subscribe |
| GET | `/api/v1/customer/notifications` | END_USERS | Notification history |
| POST | `/api/v1/customer/push-subscription` | END_USERS | Save VAPID push subscription |

### Restaurant partner

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/restaurant/notifications/stream/{restaurantId}` | RESTAURANT_OWNER | SSE subscribe |
| GET | `/api/v1/restaurant/notifications/{restaurantId}` | RESTAURANT_OWNER | Notification history |

### Driver

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/driver/notifications/stream` | DRIVER | SSE subscribe |
| GET | `/api/v1/driver/notifications` | DRIVER | Notification history |
| POST | `/api/v1/driver/push-subscription` | DRIVER | Save VAPID push subscription |
