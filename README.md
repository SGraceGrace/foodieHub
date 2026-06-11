# FoodieHub

A food delivery web application (Swiggy/Zomato-style) built as a portfolio project to demonstrate microservices architecture, real-time notifications, and a complete end-to-end order flow.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/SGraceGrace/foodieHub)

---

## Architecture

```
Angular Frontend (port 4200)
          ↓
Spring Cloud Gateway (port 8080)
          ↓
┌──────────────────┬─────────────────┬──────────────────┬──────────────────────┐
│  user-service    │  food-service   │  order-service   │ notification-service │
│    (8081)        │    (8082)       │    (8083)        │       (8084)         │
│    MySQL         │   MongoDB       │   MongoDB        │      MongoDB         │
└──────────────────┴─────────────────┴──────────────────┴──────────────────────┘
       ↓                  ↓                  ↓                    ↓
     Redis           Elasticsearch        RabbitMQ            RabbitMQ
 (sessions/cart)    (search index)     (order events)      (notification events)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 19 |
| API Gateway | Spring Cloud Gateway |
| Auth | JWT + Spring Security + Google OAuth2 |
| Relational DB | MySQL 8 |
| Document DB | MongoDB 7 |
| Cache | Redis 7 |
| Messaging | RabbitMQ 3 |
| Search | Elasticsearch 8 |
| Payments | Razorpay |
| Notifications | SSE + Web Push (VAPID) |
| Containers | Docker + Docker Compose |

---

## Deploy to Render

Click the button above, or go to **Render Dashboard → New → Blueprint** and connect this repo. Render reads `render.yaml` and creates all 6 services automatically.

After the services spin up, fill in the required environment variables in each service's dashboard:

| Variable | Where to get it |
|---|---|
| `JWT_KEY` | Any random string, min 32 characters |
| `DB_URL` | MySQL connection string (e.g. TiDB Cloud free tier) |
| `MONGODB_URI` | MongoDB Atlas free cluster connection string |
| `REDIS_URL` | Upstash Redis free tier |
| `RABBITMQ_URL` | CloudAMQP free tier (`amqps://...`) |
| `ELASTICSEARCH_URI` | Elastic Cloud 14-day trial or Bonsai free tier |
| `GOOGLE-CLIENT-ID` / `GOOGLE-SECRET` | [Google Cloud Console](https://console.cloud.google.com/) → Credentials → OAuth 2.0 |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys) → API Keys |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | Gmail address + [App Password](https://myaccount.google.com/apppasswords) |

> **Already deployed manually?** Your existing Render services are unaffected. Render matches by service name and skips duplicates.

---

## Quick Start — Docker Compose

The fastest way to run the full stack locally. One command starts everything.

### 1. Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- At least **4 GB RAM** allocated to Docker (Elasticsearch needs it)
  - Docker Desktop → Settings → Resources → Memory → set to 4 GB or more

### 2. Clone and configure

```bash
git clone https://github.com/your-username/foodiehub.git
cd foodiehub

# Create your local env file from the template
cp .env.example .env
```

Open `.env` and fill in the required secrets:

| Variable | Where to get it |
|---|---|
| `JWT_KEY` | Any random string, min 32 characters |
| `GOOGLE-CLIENT-ID` / `GOOGLE-SECRET` | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth 2.0 Client ID |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys) → API Keys (use test keys) |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | A Gmail address + an [App Password](https://myaccount.google.com/apppasswords) |

> **Google OAuth redirect URI** — in Google Cloud Console, add this as an Authorized Redirect URI:
> `http://localhost:8080/login/oauth2/code/google`

### 3. Build and start

```bash
docker-compose up --build
```

First run takes ~5–10 minutes (Maven downloads dependencies, npm installs packages).
Subsequent runs are much faster.

### 4. Open the app

| URL | What it is |
|---|---|
| http://localhost:4200 | Angular frontend |
| http://localhost:8080 | API Gateway (direct API access) |
| http://localhost:8081/swagger-ui.html | User Service — Swagger UI |
| http://localhost:8082/swagger-ui.html | Food Service — Swagger UI |
| http://localhost:8083/swagger-ui.html | Order Service — Swagger UI |
| http://localhost:8084/swagger-ui.html | Notification Service — Swagger UI |
| http://localhost:15672 | RabbitMQ management UI (guest / guest) |
| http://localhost:9200 | Elasticsearch (health check) |

### 5. First-time search setup

After all services are up, seed the Elasticsearch index from MongoDB:

```bash
curl -X POST http://localhost:8080/api/search/reindex
```

This only needs to be done once. The index stays in sync automatically after that.

### Useful commands

```bash
# Start in background
docker-compose up --build -d

# View logs for a specific service
docker-compose logs -f food-service

# Stop everything (keeps data volumes)
docker-compose down

# Stop and wipe all data (fresh start)
docker-compose down -v

# Rebuild a single service after a code change
docker-compose up --build user-service
```

---

## Manual Setup — IntelliJ / Local Dev

Use this approach when actively developing a service and want hot reload.

### 1. Start infrastructure

Run each infrastructure service in Docker:

```bash
docker run -d --name mysql         -p 3306:3306  -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=foodiehub mysql:8
docker run -d --name mongodb       -p 27017:27017 mongo:7
docker run -d --name redis         -p 6379:6379   redis:7-alpine
docker run -d --name rabbitmq      -p 5672:5672 -p 15672:15672 rabbitmq:3-management
docker run -d --name elasticsearch -p 9200:9200   -e "discovery.type=single-node" -e "xpack.security.enabled=false" -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" docker.elastic.co/elasticsearch/elasticsearch:8.13.4
```

### 2. Set environment variables

In IntelliJ: Run Configuration → Environment Variables (or use a `.env` plugin).

Required variables for each service:

**All services**
```
JWT_KEY=your-secret-key-min-32-chars
```

**user-service**
```
GOOGLE-CLIENT-ID=your-google-client-id
GOOGLE-SECRET=your-google-client-secret
JWT_EXPIRATION=3600000
REFRESH_TOKEN_EXPIRATION=864000000
```

**order-service**
```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your-secret
```

**notification-service**
```
MAIL_USERNAME=your-gmail@gmail.com
MAIL_PASSWORD=your-16-char-app-password
ADMIN_EMAIL=your-gmail@gmail.com
```

### 3. Start services in order

| Service | Port | Main class |
|---|---|---|
| user-service | 8081 | `FoodieHubApplication` |
| food-service | 8082 | `FoodServiceApplication` |
| order-service | 8083 | `OrderServiceApplication` |
| notification-service | 8084 | `NotificationServiceApplication` |
| api-gateway | 8080 | `ApiGatewayApplication` |

### 4. Start the frontend

```bash
cd foodieHub-FE
npm install
ng serve
```

Frontend runs at http://localhost:4200

---

## Key Features

- Register / login with email+password or Google OAuth2
- Browse restaurants with cuisine filter, rating sort, and proximity sort
- Full-text fuzzy search across restaurants and menu items (Elasticsearch)
- Cart management stored in Redis (2-hour TTL)
- Checkout with Razorpay payment gateway
- Live order tracking via Server-Sent Events (SSE)
- Real-time notifications for customers, restaurant partners, drivers, and admin (SSE + Web Push)
- Restaurant partner workspace — order management, live stats, menu editing
- Driver portal — order acceptance, delivery flow, earnings tracking
- Admin dashboard — user management, partner/driver approvals, activity logs, promo slides

---

## Project Structure

```
foodiehub/
├── api-gateway/            Spring Cloud Gateway — routing + JWT filter
├── user-service/           Auth, JWT, Google OAuth2, user management (MySQL)
├── food-service/           Restaurants, menus, search, ratings (MongoDB + Elasticsearch)
├── order-service/          Cart, orders, payments, driver flow (MongoDB + Redis + Razorpay)
├── notification-service/   SSE + Web Push for all roles (MongoDB + RabbitMQ)
├── foodieHub-FE/           Angular 19 frontend
├── docker-compose.yml      Full local stack — one command to run everything
├── .env.example            Environment variable template
└── pending/                Pending features and work items
```
