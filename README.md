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

Create a `.env` or set these before starting each service:

| Variable | Used by | Example |
|---|---|---|
| `JWT_KEY` | api-gateway, user-service | any long random string |
| `SPRING_DATASOURCE_URL` | user-service | `jdbc:mysql://localhost:3306/foodiehub` |
| `SPRING_DATA_MONGODB_URI` | food-service, order-service | `mongodb://localhost:27017/foodiehub_food` |
| `VAPID_PUBLIC_KEY` | notification-service | generated VAPID key pair |
| `VAPID_PRIVATE_KEY` | notification-service | generated VAPID key pair |

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
