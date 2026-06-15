# Security Design

---

## Core Principle: Gateway as Auth Boundary

The API gateway is the **single point where JWT tokens are validated**. Downstream microservices do not re-validate JWT signatures. Instead, they trust the headers the gateway injects.

```
Client request with: Authorization: Bearer <token>
        │
        ▼
┌─────────────────────────────────────────┐
│            API GATEWAY                  │
│                                         │
│  JwtAuthFilter:                         │
│    1. Parse + verify JWT signature      │
│    2. Check token is not expired        │
│    3. Extract subject (email) + role    │
│    4. Inject X-User-Id: user@email.com  │
│       Inject X-User-Role: {authority=ROLE_END_USERS}│
└────────────────┬────────────────────────┘
                 │ Forwarded request (no original Authorization header)
                 │ New headers: X-User-Id, X-User-Role
                 ▼
        ┌────────────────┐
        │ Microservice   │
        │                │
        │ HeaderAuthFilter│
        │   reads X-User-Id    │
        │   reads X-User-Role  │
        │   creates Authentication│
        │   object for Spring  │
        │   Security context   │
        └────────────────┘
```

**Why this design?**

- Each service does not need a copy of the JWT secret — only the gateway holds it
- Downstream services are simpler: they just read headers
- Adding a new service is easy: just add gateway routes; auth comes for free
- All auth enforcement is in one place: easier to audit and change

**Security assumption:** The downstream microservices must only be reachable through the gateway, not directly from the internet. In production, the gateway is the only service with a public IP; all other services are in a private network.

---

## `HeaderAuthFilter`

Each microservice (user-service, food-service, order-service, notification-service) has a `HeaderAuthFilter` that reads the gateway-injected headers and builds a Spring Security `Authentication` object:

```java
String userId = request.getHeader("X-User-Id");
String role   = request.getHeader("X-User-Role");

// X-User-Role looks like: {authority=ROLE_END_USERS}
// Extract the role name between '=' and '}'
String cleanRole = role.substring(role.indexOf('=') + 1, role.indexOf('}'));

UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
    userId,
    null,
    List.of(new SimpleGrantedAuthority(cleanRole))  // e.g. ROLE_END_USERS
);
SecurityContextHolder.getContext().setAuthentication(auth);
```

After this filter runs, Spring Security's `@PreAuthorize` annotations can evaluate against the populated context:

```java
@PreAuthorize("hasRole('END_USERS')")         // checks for ROLE_END_USERS
@PreAuthorize("hasRole('ADMIN')")             // checks for ROLE_ADMIN
@PreAuthorize("hasRole('SUPER_ADMIN')")       // checks for ROLE_SUPER_ADMIN
@PreAuthorize("hasRole('RESTAURANT_OWNER')") // checks for ROLE_RESTAURANT_OWNER
@PreAuthorize("hasRole('DRIVER')")           // checks for ROLE_DRIVER
```

Spring's `hasRole('X')` automatically prepends `ROLE_`, so `hasRole('END_USERS')` matches authority `ROLE_END_USERS`.

---

## Role Definitions

| Role (enum) | Spring authority | Who |
|---|---|---|
| `END_USERS` | `ROLE_END_USERS` | Customers who order food |
| `ADMIN` | `ROLE_ADMIN` | Platform admins |
| `SUPER_ADMIN` | `ROLE_SUPER_ADMIN` | Full access; includes admin permissions |
| `RESTAURANT_OWNER` | `ROLE_RESTAURANT_OWNER` | Restaurant partners |
| `DRIVER` | `ROLE_DRIVER` | Delivery drivers |

**Important:** The role name is `END_USERS`, not `CUSTOMER`. Using `hasRole('CUSTOMER')` anywhere in the codebase will always deny access because no such role exists.

---

## Sensitive Headers

### `X-User-Id`

Contains the user's email address (the JWT `sub` claim). Downstream services use this as the user identifier:

- order-service: `userId = request.getHeader("X-User-Id")`
- food-service: `customerId = request.getHeader("X-User-Id")`

The gateway sets this from the verified JWT `sub` claim. The client cannot forge this header — the gateway overwrites it on every request.

### `X-User-Role`

Contains the stringified role. Format: `{authority=ROLE_END_USERS}`. The `HeaderAuthFilter` parses the value between `=` and `}`.

---

## Public vs Protected Path Matrix

| Path | GET | POST | PUT/PATCH | DELETE |
|---|---|---|---|---|
| `/api/v1/auth/**` | — | Public | — | — |
| `/api/v1/refresh-token` | — | Public | — | — |
| `/api/v1/restaurants` | Public | Auth (RESTAURANT_OWNER) | — | — |
| `/api/v1/restaurants/**` | Public | Auth (END_USERS for rating) | Auth (RESTAURANT_OWNER) | Auth (ADMIN) |
| `/api/search` | Public | — | — | — |
| `/api/v1/slides` | Public | Auth (ADMIN) | Auth (ADMIN) | Auth (ADMIN) |
| `/api/v1/coupons/active` | Public | — | — | — |
| `/api/cart/**` | Auth (END_USERS) | Auth (END_USERS) | — | Auth (END_USERS) |
| `/api/orders/**` | Auth (varies) | Auth (END_USERS) | Auth (varies) | — |
| `/api/v1/payments/**` | — | Auth (END_USERS) | — | — |
| `/api/v1/user` | Auth (self) | — | Auth (self) | — |
| `/api/v1/admin/**` | Auth (ADMIN) | Auth (ADMIN) | Auth (ADMIN) | Auth (ADMIN) |
| `/api/v1/partner/**` | Auth (RESTAURANT_OWNER) | Public (register) | Auth | — |
| `/api/v1/driver/**` | Auth (DRIVER) | Public (register) | Auth | — |
| `/oauth2/**` | Public | — | — | — |

---

## JWT Security Details

### Algorithm
HMAC-SHA256 (`HS256`). The secret is a shared symmetric key (`JWT_KEY` env var). Both the gateway (for validation) and user-service (for issuance) use the same secret.

### Token expiry
Access token TTL is set by `JWT_EXPIRATION` env var (typically 24 hours). The actual expiry is embedded in the `exp` claim and verified by JJWT at parse time.

### Redis session invalidation
JWT tokens are stateless by design — normally, a valid unexpired token cannot be revoked. FoodieHub adds stateful validation via Redis:

1. On login: store `session:{username}:{deviceId} = <token>` with TTL matching token expiry
2. On validation: check that the stored token matches the incoming token
3. On logout: delete the Redis key → token is immediately invalid even if not expired

This makes tokens effectively revocable at the cost of one Redis read per authenticated request on user-service. The gateway does not do the Redis check — only user-service does it for user-service endpoints. Downstream services rely purely on the gateway's JWT signature check.

### Refresh token rotation
Every refresh-token use issues a new refresh token (the old one is deleted from the database). A stolen refresh token can only be used once before it is invalidated by the legitimate user's next refresh.

---

## Password Security

Passwords are hashed with **BCrypt** (`BCryptPasswordEncoder`). BCrypt automatically generates and embeds a salt in the hash, so identical passwords have different hashes. The work factor (cost) defaults to 10, giving ~100ms hashing time on modern hardware — too slow for brute-force attacks, fast enough for login.

OAuth2 accounts have no password (`password = null`). The `SecurityConfig` permits this by not requiring a non-null password in the `UserDetailsService`.

---

## CORS Security

CORS is configured on the gateway with `allowedOriginPatterns: ["*"]` for development. For production:
- Replace `*` with the actual frontend URL (e.g., `https://foodiehub.onrender.com`)
- Keep `allowCredentials: true` (required for `Authorization` header cross-origin)

Downstream services do not need CORS configuration — all browser requests go through the gateway, which is on the same origin as far as the browser is concerned after deployment (or is the explicit CORS origin).

---

## Rate Limiting

The `RateLimitFilter` in the gateway applies per-IP rate limiting using Redis:

- **Window:** 1 minute (sliding)
- **Limit:** 100 requests/IP/minute
- **Response:** `429 Too Many Requests` with `Retry-After: 60`
- **Scope:** All paths, including public ones

This protects against:
- Login brute-force (combined with BCrypt's slowness)
- Scraping of public restaurant/menu data
- DoS amplification through the circuit breakers

For production, a more sophisticated rate limiter (per-endpoint limits, authenticated-user limits, IP allowlists) would be needed.

---

## Razorpay Payment Security

The payment verification uses HMAC-SHA256 to confirm that the `razorpayPaymentId` returned by the browser was actually issued by Razorpay for the specific `razorpayOrderId` that was created server-side:

```
signature = HMAC-SHA256(razorpayOrderId + "|" + razorpayPaymentId, razorpayKeySecret)
```

If the client forges a `razorpayPaymentId` (e.g., reuses an old one or makes one up), the HMAC will not match the `razorpaySignature` and the verification will fail with `400 Bad Request`. This prevents:
- Free orders by forging a payment success
- Replay attacks with a previous payment ID
