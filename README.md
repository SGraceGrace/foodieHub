# FoodieHub 🍔

A food delivery web application (Swiggy/Zomato-style) built as a portfolio POC to demonstrate microservices architecture.

---

## Architecture

```
Angular Frontend (4200)
        ↓
Spring Cloud Gateway (8080)
        ↓
┌─────────────────┬──────────────────┬───────────────────┬──────────────────────┐
│  user-service   │  food-service    │  order-service    │ notification-service │
│     (8081)      │     (8082)       │     (8083)        │       (8084)         │
│     MySQL       │    MongoDB       │    MongoDB        │      MongoDB         │
└─────────────────┴──────────────────┴───────────────────┴──────────────────────┘
        ↓                  ↓                  ↓
      Redis           Elasticsearch        RabbitMQ
  (sessions/cart)     (search index)    (order events)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 17+ |
| API Gateway | Spring Cloud Gateway |
| Auth | JWT + Spring Security |
| Relational DB | MySQL 8 |
| Document DB | MongoDB 7 |
| Cache | Redis 7 |
| Messaging | RabbitMQ 3 |
| Search | Elasticsearch 8 |
| Containers | Docker |

---

## Prerequisites

Make sure the following infrastructure services are running before starting any backend service.

### Redis
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### RabbitMQ
```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```
Management UI → http://localhost:15672 (guest / guest)

### Elasticsearch
```bash
docker run -d --name elasticsearch -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" docker.elastic.co/elasticsearch/elasticsearch:8.13.4
```
Verify it's up → http://localhost:9200

### MySQL
```bash
docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=foodiehub mysql:8
```

### MongoDB
```bash
docker run -d --name mongodb -p 27017:27017 mongo:7
```

---

## Running the Services

Start in this order (infrastructure must be up first):

| Service | Port | How to start |
|---|---|---|
| user-service | 8081 | Run `FoodieHubApplication` |
| food-service | 8082 | Run `FoodServiceApplication` |
| order-service | 8083 | Run `OrderServiceApplication` |
| notification-service | 8084 | Run `NotificationServiceApplication` |
| api-gateway | 8080 | Run `ApiGatewayApplication` |
| Angular frontend | 4200 | `ng serve` |

---

## Search — First-time Setup

After starting `food-service` for the first time (or after wiping Elasticsearch), run the reindex endpoint to populate the search index from MongoDB:

```bash
curl -X POST http://localhost:8080/api/search/reindex
```

From that point on, the index stays in sync automatically — every restaurant save and every menu save writes through to Elasticsearch.

To test search:
```bash
curl "http://localhost:8080/api/search?q=biryani"
```

---

## Environment Variables

Set these as environment variables (or in IntelliJ Run Configurations → Environment Variables) before starting each service.

### api-gateway

| Variable | Description | Example |
|---|---|---|
| `JWT_KEY` | Secret key used to verify JWT tokens (must match user-service) | any long random string, e.g. `mySuperSecretKey123!` |

---

### user-service

| Variable | Description | Example |
|---|---|---|
| `JWT_KEY` | Secret key used to sign JWT tokens (must match api-gateway) | same value as api-gateway |
| `JWT_EXPIRATION` | Access token TTL in milliseconds | `3600000` (1 hour) |
| `REFRESH_TOKEN_EXPIRATION` | Refresh token TTL in milliseconds | `86400000` (24 hours) |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID | from Google Cloud Console → Credentials |
| `GOOGLE_SECRET` | Google OAuth2 client secret | from Google Cloud Console → Credentials |
| `RABBITMQ_HOST` | RabbitMQ host _(optional, defaults to localhost)_ | `localhost` |
| `RABBITMQ_PORT` | RabbitMQ port _(optional, defaults to 5672)_ | `5672` |
| `RABBITMQ_USERNAME` | RabbitMQ username _(optional, defaults to guest)_ | `guest` |
| `RABBITMQ_PASSWORD` | RabbitMQ password _(optional, defaults to guest)_ | `guest` |

> **Google OAuth setup:**
> 1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
> 2. Create an OAuth 2.0 Client ID (Web application)
> 3. Add `http://localhost:8081/login/oauth2/code/google` as an Authorized Redirect URI
> 4. Copy the Client ID → `GOOGLE_CLIENT_ID` and Client Secret → `GOOGLE_SECRET`

---

### order-service

| Variable | Description | Example |
|---|---|---|
| `RAZORPAY_KEY_ID` | Razorpay API key ID | from Razorpay Dashboard → API Keys |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret | from Razorpay Dashboard → API Keys |

---

### notification-service

| Variable | Description | Example |
|---|---|---|
| `MAIL_USERNAME` | Gmail address used to send emails | `yourapp@gmail.com` |
| `MAIL_PASSWORD` | Gmail App Password (not your regular Gmail password) | 16-char app password from Google Account → Security → App Passwords |
| `VAPID_PUBLIC_KEY` | VAPID public key for Web Push notifications | generate with `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | VAPID private key for Web Push notifications | generate with `npx web-push generate-vapid-keys` |
| `ADMIN_EMAIL` | Email address for admin alerts _(optional)_ | `admin@foodiehub.com` |
| `USER_SERVICE_URL` | URL of user-service _(optional, defaults to localhost:8081)_ | `http://localhost:8081` |
| `RABBITMQ_HOST` | RabbitMQ host _(optional, defaults to localhost)_ | `localhost` |
| `RABBITMQ_PORT` | RabbitMQ port _(optional, defaults to 5672)_ | `5672` |
| `RABBITMQ_USERNAME` | RabbitMQ username _(optional, defaults to guest)_ | `guest` |
| `RABBITMQ_PASSWORD` | RabbitMQ password _(optional, defaults to guest)_ | `guest` |

> **Gmail App Password setup:**
> 1. Enable 2-Step Verification on your Google Account
> 2. Go to Google Account → Security → App Passwords
> 3. Create a new app password for "Mail"
> 4. Use that 16-character password as `MAIL_PASSWORD`

> **VAPID key generation:**
> ```bash
> npx web-push generate-vapid-keys
> ```
> Copy the output `Public Key` → `VAPID_PUBLIC_KEY` and `Private Key` → `VAPID_PRIVATE_KEY`

---

## Key Features

- JWT authentication with refresh tokens
- Restaurant browsing with cuisine filter, proximity sort, and rating sort
- Full-text fuzzy search across restaurants and menu items (Elasticsearch)
- Cart management (Redis TTL-based)
- Order placement and tracking with live status updates (SSE)
- Real-time notifications for admin, restaurant partners, and customers (SSE + Web Push)
- Driver portal with order assignment and delivery flow
- Admin dashboard — users, restaurants, drivers, contact messages, activity logs
