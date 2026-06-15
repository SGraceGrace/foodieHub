# Infrastructure

---

## Local Development Setup

All services run locally. Infrastructure (MySQL, MongoDB, Redis, RabbitMQ, Elasticsearch) is managed with Docker. Spring Boot services are started directly from IntelliJ or the terminal.

### Step 1 — Start infrastructure

```bash
docker compose up mysql mongodb redis rabbitmq elasticsearch -d
```

This starts the five infrastructure containers in detached mode. They expose ports on `localhost`.

### Step 2 — Start Spring Boot services

Start each service from IntelliJ (Run button) or terminal:

```
user-service      → Run FoodieHubApplication        (port 8081)
food-service      → Run FoodServiceApplication       (port 8082)
order-service     → Run OrderServiceApplication      (port 8083)
notification-service → Run NotificationServiceApplication (port 8084)
api-gateway       → Run ApiGatewayApplication        (port 8080)
```

Order matters: start infrastructure first, then services (any order), then gateway.

### Step 3 — Start Angular

```bash
cd frontend/foodiehub-angular
ng serve
```

Angular dev server auto-reloads on file changes. No restart needed.

---

## Environment Variables

Each Spring Boot service reads configuration from environment variables with fallback defaults for local development. In IntelliJ, set these in the Run Configuration's "Environment variables" field.

### Required (no safe default)

| Variable | Used by | Description |
|---|---|---|
| `JWT_KEY` | api-gateway, user-service | HMAC-SHA256 signing secret. Must be the same value in both services. Minimum 32 characters. |
| `JWT_EXPIRATION` | user-service | Access token TTL in milliseconds. E.g., `86400000` = 24h |
| `REFRESH_TOKEN_EXPIRATION` | user-service | Refresh token TTL in milliseconds. E.g., `604800000` = 7d |
| `GOOGLE-CLIENT-ID` | user-service | Google OAuth2 client ID from Google Cloud Console |
| `GOOGLE-SECRET` | user-service | Google OAuth2 client secret |
| `MAIL_USERNAME` | notification-service | Gmail address for sending emails |
| `MAIL_PASSWORD` | notification-service | Gmail App Password (not the account password) |
| `RAZORPAY_KEY_ID` | order-service | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | order-service | Razorpay API key secret |
| `VAPID_PUBLIC_KEY` | notification-service | VAPID public key (Base64url encoded, 65 bytes) |
| `VAPID_PRIVATE_KEY` | notification-service | VAPID private key (Base64url encoded, 32 bytes) |

### Optional (have safe local defaults)

| Variable | Default | Description |
|---|---|---|
| `DB_URL` | `jdbc:mysql://localhost:3306/foodiehub` | MySQL JDBC URL |
| `DB_USERNAME` | `root` | MySQL user |
| `DB_PASSWORD` | `root` | MySQL password |
| `MONGODB_URI` | `mongodb://localhost:27017/foodiehub_food` | MongoDB connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672` | RabbitMQ connection URL |
| `ELASTICSEARCH_URI` | `http://localhost:9200` | Elasticsearch URL |
| `USER_SERVICE_URL` | `http://localhost:8081` | Used by api-gateway and notification-service |
| `FOOD_SERVICE_URL` | `http://localhost:8082` | Used by api-gateway |
| `ORDER_SERVICE_URL` | `http://localhost:8083` | Used by api-gateway |
| `NOTIFICATION_SERVICE_URL` | `http://localhost:8084` | Used by api-gateway |
| `GATEWAY_URL` | `http://localhost:8080` | OAuth2 redirect base URL (used by user-service) |
| `PORT` | Service-specific (8080–8084) | HTTP port |
| `TRACING_SAMPLING_PROBABILITY` | `0.0` | Zipkin trace sampling (0.0 = disabled, 1.0 = all) |

---

## Docker Compose

The `docker-compose.yml` at the project root defines both infrastructure containers and Spring Boot service containers.

### Infrastructure services

```yaml
mysql:
  image: mysql:8
  ports: ["3306:3306"]
  environment:
    MYSQL_ROOT_PASSWORD: root
    MYSQL_DATABASE: foodiehub
  volumes:
    - mysql_data:/var/lib/mysql   # persists data across container restarts

mongodb:
  image: mongo:7
  ports: ["27017:27017"]
  volumes:
    - mongo_data:/data/db

redis:
  image: redis:7-alpine
  ports: ["6379:6379"]

rabbitmq:
  image: rabbitmq:3-management
  ports:
    - "5672:5672"    # AMQP protocol
    - "15672:15672"  # Management UI (guest/guest at localhost:15672)

elasticsearch:
  image: elasticsearch:8.x
  ports: ["9200:9200"]
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
```

### Spring Boot service containers

Each service has a `Dockerfile` in its directory:

```dockerfile
FROM eclipse-temurin:17-jre
COPY target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

Build and start everything with:

```bash
mvn -pl user-service,food-service,order-service,notification-service,api-gateway package -DskipTests
docker compose up --build
```

---

## Render Deployment

FoodieHub is deployed to Render using a `render.yaml` Blueprint that defines all services declaratively.

### Architecture on Render

```
Render Web Service: api-gateway (port 8080 → public HTTPS URL)
Render Web Service: user-service
Render Web Service: food-service
Render Web Service: order-service
Render Web Service: notification-service
Render Web Service: frontend (Angular built to static files, served by Nginx)

Render Managed Databases / External:
  MySQL (PlanetScale or Render managed)
  MongoDB Atlas (free tier)
  Redis (Upstash free tier)
  RabbitMQ (CloudAMQP free tier)
  Elasticsearch (Elastic Cloud free trial or Bonsai.io)
```

### Service URLs on Render

Each Render service gets a URL like `https://foodiehub-user-service.onrender.com`. The `render.yaml` Blueprint sets environment variables to wire them together:

```yaml
envVars:
  - key: USER_SERVICE_URL
    value: https://foodiehub-user-service.onrender.com
  - key: JWT_KEY
    sync: false  # set in Render dashboard (secret)
```

### Free tier limitations

- Render free web services **spin down after 15 minutes of inactivity**. The first request after idle takes ~30 seconds to cold-start.
- MongoDB Atlas free tier limits: 512 MB storage, shared cluster
- CloudAMQP free tier: 1M messages/month, 1 connection

For a live demo this is acceptable. For production, paid tiers are needed.

---

## Infrastructure Details

### MySQL 8

- **Database:** `foodiehub`
- **Character set:** `utf8mb4` (supports full Unicode including emojis)
- **Schema management:** `spring.jpa.hibernate.ddl-auto: update` — Hibernate auto-creates and updates tables on startup. Tables are never dropped, only added or altered. Safe for development; migrations should be managed manually for production.
- **Connection pool:** HikariCP (Spring Boot default). Pool size: 10 connections.

### MongoDB 7

- **Database:** `foodiehub_food`
- **Index creation:** `spring.data.mongodb.auto-index-creation: true` in food-service ensures `@Indexed` annotations are applied at startup. This creates the `geoPoint` 2dsphere index and the `orderId` unique index on `ratings`.
- **Document size limit:** 16 MB per document. Restaurant menus comfortably fit within this.

### Redis 7

- **Connection:** `RedisConnectionFactory` via `spring.data.redis.url`
- **Serialization in food-service:** `GenericJackson2JsonRedisSerializer` — stores JSON with `@class` type info so Spring Cache can deserialize correctly.
- **Serialization in user/order-service:** `StringRedisTemplate` — raw string operations for sessions, locks, and idempotency keys.
- **Default eviction policy:** `noeviction` (Redis refuses writes when memory is full rather than evicting keys). For a caching use case, `allkeys-lru` is better — set this in production.

### RabbitMQ 3.x

- **Exchange:** `foodiehub.exchange` (topic type)
- **Management UI:** `http://localhost:15672` — username `guest`, password `guest`
- **Queue durability:** All queues are declared with `durable: true`. Messages survive RabbitMQ restarts.
- **Message format:** JSON, serialized by `Jackson2JsonMessageConverter`
- **Consumer acknowledgement:** Auto-ack (Spring default). Messages are acknowledged immediately on delivery, not on processing success. In production, manual ack would be more reliable.

### Elasticsearch

- **Mode:** Single-node (no cluster)
- **Security:** Disabled (`xpack.security.enabled: false`) for development simplicity
- **Index:** `restaurants` — fields: name, cuisine, menu items (text-analyzed), rating, status
- **Indexing:** Synchronous on every restaurant save. If ES is down, the save still succeeds but the search index lags.
- **Search:** `match` query across name, cuisine, and menu item name fields with relevance scoring

---

## Service Restart Guide

After code changes, restart the affected service(s). Code changes do not take effect until restart.

| What changed | Restart |
|---|---|
| `api-gateway/src/**` or `api-gateway/resources/application.yaml` | api-gateway |
| `user-service/src/**` | user-service |
| `food-service/src/**` | food-service |
| `order-service/src/**` | order-service |
| `notification-service/src/**` | notification-service |
| `frontend/foodiehub-angular/src/**` | Angular dev server auto-reloads — no restart |
| `.env` or environment variables | Whichever service uses that variable |

**Rule:** If you touched a `.java` file or `application.yaml` in a service, restart that service. If you touched `api-gateway/resources/application.yaml` (routes), restart the gateway too.

---

## Distributed Tracing (Zipkin)

All five services have Micrometer Tracing configured to send spans to Zipkin:

```yaml
management:
  tracing:
    sampling:
      probability: ${TRACING_SAMPLING_PROBABILITY:0.0}
  zipkin:
    tracing:
      endpoint: ${ZIPKIN_URL:http://localhost:9411}/api/v2/spans
```

**Default is disabled (`0.0` sampling probability).** This prevents constant `WARN` log spam from connection refused errors when Zipkin is not running.

To enable tracing for debugging:
1. Start Zipkin: `docker run -p 9411:9411 openzipkin/zipkin`
2. Set env var: `TRACING_SAMPLING_PROBABILITY=1.0` on the services you want to trace
3. Open `http://localhost:9411` to view traces

A trace follows a single request across all services it touches, showing timing breakdowns for each span (gateway → service → DB query → RabbitMQ publish).
