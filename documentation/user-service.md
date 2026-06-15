# User Service

**Port:** 8081  
**Database:** MySQL 8 (`foodiehub`)  
**Tech:** Spring Boot 3.x, Spring Security, Spring Data JPA, JJWT, Spring AMQP  
**File:** `backend/user-service`

---

## Responsibilities

- Register and authenticate all user types (customers, admins, restaurant owners, drivers)
- Issue and validate JWT access tokens
- Issue and rotate refresh tokens
- Manage Redis session store for active JWT sessions
- Publish RabbitMQ events for partner/driver registrations and activity logs
- Handle Google OAuth2 login
- Admin: manage users, approve/reject restaurant owners, view activity logs

---

## MySQL Schema

```sql
-- Core user account
CREATE TABLE user (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name  VARCHAR(255) NOT NULL,
    last_name   VARCHAR(255) NOT NULL,
    username    VARCHAR(255) NOT NULL UNIQUE,  -- stores the email address
    email       VARCHAR(255) NOT NULL,
    password    VARCHAR(255),                  -- NULL for OAuth2-only accounts
    phone       VARCHAR(20),
    status      ENUM('ACTIVE','INACTIVE','SUSPENDED'),
    auth_provider ENUM('LOCAL','GOOGLE'),
    created_at  DATETIME,
    updated_at  DATETIME
);

-- Role lookup table
CREATE TABLE role (
    id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    name ENUM('END_USERS','ADMIN','SUPER_ADMIN','RESTAURANT_OWNER','DRIVER')
);

-- Many-to-many join
CREATE TABLE user_roles (
    user_id BIGINT REFERENCES user(id),
    role_id BIGINT REFERENCES role(id)
);

-- Refresh token per user session
CREATE TABLE refresh_token (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    token       VARCHAR(500) NOT NULL UNIQUE,
    user_id     BIGINT REFERENCES user(id),
    expiry_date DATETIME NOT NULL
);

-- Driver profile (linked to user)
CREATE TABLE driver (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT REFERENCES user(id),
    vehicle_type    VARCHAR(50),
    vehicle_number  VARCHAR(30),
    license_number  VARCHAR(30),
    is_available    BOOLEAN DEFAULT TRUE,
    created_at      DATETIME
);
```

### Why MySQL for user data?

Users and auth data are relational and structured. The `user → roles` relationship is a many-to-many join that maps cleanly to relational tables. MySQL's ACID guarantees prevent partial writes — if a user is created but the role assignment fails, the entire transaction rolls back. A corrupt user record (created but without a role) would break every login, so transactional safety matters here.

---

## Role System

| Enum value | Spring Security role | Who has it |
|---|---|---|
| `END_USERS` | `ROLE_END_USERS` | Regular customers |
| `ADMIN` | `ROLE_ADMIN` | Platform admins |
| `SUPER_ADMIN` | `ROLE_SUPER_ADMIN` | Super admins (full access) |
| `RESTAURANT_OWNER` | `ROLE_RESTAURANT_OWNER` | Restaurant partners |
| `DRIVER` | `ROLE_DRIVER` | Delivery drivers |

The `Role.END_USERS` enum value maps to the Spring authority `ROLE_END_USERS`. Downstream services check `@PreAuthorize("hasRole('END_USERS')")` which Spring expands to `ROLE_END_USERS`. **Never use `hasRole('CUSTOMER')`** — there is no such role in this system.

Admin accounts are seeded at startup by `UserDataSeeder.java`:
- **Email/username:** `admin@foodiehub.com`
- **Password:** `Admin@123`
- **Role:** `SUPER_ADMIN`

---

## Authentication Flows

### Local login (email + password)

```
Client → POST /api/v1/auth/login { username, password, deviceId }
  │
  ▼
UserDetailsService.loadUserByUsername(username)
  → fetch user from MySQL
  │
  ▼
BCryptPasswordEncoder.matches(rawPassword, storedHash)
  │ success
  ▼
JwtService.generateToken(user)
  → Claims: sub=email, role=[{authority:ROLE_END_USERS}], iat, exp
  → Signs with HMAC-SHA256 (secret from JWT_KEY env var)
  │
  ▼
Redis.set("session:{username}:{deviceId}", jwtToken, TTL=24h)
  │
  ▼
RefreshTokenService.createRefreshToken(userId)
  → Random UUID stored in DB with expiry (REFRESH_TOKEN_EXPIRATION env var)
  │
  ▼
Response: { token, refreshToken, userId, email, firstName, role }
```

### JWT structure

```json
{
  "sub": "user@email.com",
  "role": [{"authority": "ROLE_END_USERS"}],
  "iat": 1718448000,
  "exp": 1718534400
}
```

The `role` claim is serialized as a list of `GrantedAuthority` objects. This is Spring Security's default serialization format when you pass a `Collection<GrantedAuthority>` to `Jwts.builder().claim("role", ...)`.

### JWT validation

`JwtService.validateToken()` checks two things:

1. **Signature validity** — JJWT parses the token against the signing key. Throws on `ExpiredJwtException`, `MalformedJwtException`, `SignatureException`, etc.
2. **Redis session presence** — the service looks up `session:{username}:{deviceId}` in Redis and compares the stored token to the incoming token. This enables:
   - Single-device logout (delete the Redis key)
   - Forced logout of all sessions (delete all `session:{username}:*` keys)

If either check fails, the token is rejected with 401.

### Token refresh

```
Client → POST /api/v1/refresh-token { refreshToken }
  │
  ▼
Find refresh token in DB → verify not expired
  │
  ▼
Generate new JWT → update Redis session
  │
  ▼
Response: { token, refreshToken }
```

The old refresh token is deleted and a new one is issued (rotation). This prevents replay attacks from stolen refresh tokens.

### Google OAuth2 login

```
Client → GET /oauth2/authorization/google (gateway proxies to user-service)
  │
  ▼
Spring Security redirects to Google consent screen
  │
  ▼
Google → redirect to /login/oauth2/code/google?code=...
  │
  ▼
OAuth2UserService.loadUser() → fetch profile from Google userinfo API
  → first_name, last_name, email, google_sub
  │
  ▼
If user exists (by email) → update; else create with authProvider=GOOGLE
  → password = null (no local password for OAuth2 accounts)
  │
  ▼
OAuth2SuccessHandler
  → generate JWT + refresh token (same flow as local login)
  → redirect to frontend: {FRONTEND_URL}/oauth2/callback?token=...&refreshToken=...
```

The frontend `/oauth2/callback` route reads the tokens from query params and stores them in localStorage, then redirects to the home page.

---

## Redis Session Store

Redis is used as the session backing store for two purposes:

**1. JWT session validation**

```
Key:   session:{username}:{deviceId}
Value: <jwt token string>
TTL:   24 hours (matches JWT expiry)
```

The `deviceId` is a client-generated UUID sent at login. It allows the same user to have simultaneous sessions on multiple devices. To log out from one device, the service deletes that specific key. To force-logout everywhere, it deletes all `session:{username}:*` keys.

**2. Refresh token cache**

Refresh tokens are stored in MySQL for durability (survives Redis restarts), but Redis is also used for fast-path lookup via `spring.cache.type: redis` — common operations like "is this refresh token valid?" hit Redis before falling back to MySQL.

---

## RabbitMQ Events Published

| Event | Routing key | When |
|---|---|---|
| `PartnerRegisteredEvent` | `partner.registered` | Restaurant owner submits registration form |
| `OwnerStatusEvent` | `owner.status` | Admin approves or rejects a restaurant owner |
| `DriverRegisteredEvent` | `driver.registered` | Driver submits registration form |
| `ActivityLoggedEvent` | `activity.logged` | Any admin performs an action (create user, update status, etc.) |
| `ContactMessageEvent` | `contact.message` | User submits the contact form |

All events are serialized as JSON by `Jackson2JsonMessageConverter` with class type mappings so notification-service can deserialize without guessing the class.

---

## API Reference

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/signup` | Public | Register new customer account |
| POST | `/api/v1/auth/login` | Public | Login; returns JWT + refresh token |
| POST | `/api/v1/auth/logout` | Public | Invalidate JWT session in Redis |
| POST | `/api/v1/refresh-token` | Public | Exchange refresh token for new JWT |

### User profile

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/user` | JWT | Get own profile |
| PUT | `/api/v1/user` | JWT | Update own profile (name, phone) |
| GET | `/api/v1/user/{email}` | ADMIN | Look up any user by email (used by notification-service) |

### Admin — user management

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/admin/users` | ADMIN | Paginated list of all users |
| GET | `/api/v1/admin/users/{id}` | ADMIN | Single user |
| PUT | `/api/v1/admin/users/{id}/status` | ADMIN | Activate/suspend user |
| GET | `/api/v1/admin/restaurant-owners` | ADMIN | Paginated list of restaurant owner applications |
| PUT | `/api/v1/admin/restaurant-owners/{ownerId}/approve` | ADMIN | Approve owner + publish event |
| PUT | `/api/v1/admin/restaurant-owners/{ownerId}/reject` | ADMIN | Reject owner + publish event |
| GET | `/api/v1/admin/drivers` | ADMIN | Paginated list of driver applications |
| GET | `/api/v1/admin/activity-logs` | ADMIN | Paginated admin activity log |
| GET | `/api/v1/admin/contact-messages` | ADMIN | Paginated contact form submissions |

### Partner

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/partner/register` | Public | Submit restaurant owner registration |
| GET | `/api/v1/partner/me` | RESTAURANT_OWNER | Own partner profile |

### Driver

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/driver/register` | Public | Submit driver registration |
| GET | `/api/v1/driver/me` | DRIVER | Own driver profile |
| PUT | `/api/v1/driver/availability` | DRIVER | Toggle availability |

---

## Seeded Data

`UserDataSeeder` runs at startup (`@Component` + `CommandLineRunner`) and creates these accounts if they don't exist:

| Email | Password | Role |
|---|---|---|
| `admin@foodiehub.com` | `Admin@123` | SUPER_ADMIN |

Use these credentials to access admin endpoints in development.
