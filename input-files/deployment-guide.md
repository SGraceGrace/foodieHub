# FoodieHub Deployment Guide

## What you need to make live

```
Infrastructure (managed services — don't host these yourself):
  MySQL         → Aiven free tier  OR  Railway MySQL plugin
  MongoDB       → MongoDB Atlas (free M0 — 512MB)
  Redis         → Upstash (free tier)
  RabbitMQ      → CloudAMQP (free — 1M messages/month)
  Elasticsearch → Bonsai (free — 10k docs) OR skip for demo

Your services (hosted on Railway):
  api-gateway          (8080)
  user-service         (8081)
  food-service         (8082)
  order-service        (8083)
  notification-service (8084)

Frontend:
  Angular → Netlify or Vercel (both free, forever)
```

---

## Step 1 — Dockerfiles

Every Spring Boot service needs a Dockerfile. See each service folder for its Dockerfile.

Pattern used across all services:
```dockerfile
# Stage 1: build the jar
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn package -DskipTests

# Stage 2: run the jar (smaller image — no JDK, just JRE)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE <port>
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Services and ports:

| Service | Folder | Port |
|---|---|---|
| api-gateway | `api-gateway/` | 8080 |
| user-service | `foodieHub/` | 8081 |
| food-service | `food-service/` | 8082 |
| order-service | `order-service/` | 8083 |
| notification-service | `notification-service/` | 8084 |

---

## Step 2 — Managed databases (all free)

### MongoDB Atlas
1. Go to atlas.mongodb.com → create free M0 cluster
2. Create a database user → copy the connection string:
   `mongodb+srv://user:pass@cluster.mongodb.net/foodiehub_food`
3. Network access → allow `0.0.0.0/0` (Railway needs this)

### Upstash Redis
1. Go to console.upstash.com → create free database
2. Copy the Redis URL: `redis://default:pass@host:port`

### CloudAMQP RabbitMQ
1. Go to cloudamqp.com → create free Little Lemur instance
2. Copy the AMQP URL: `amqps://user:pass@host/vhost`

### MySQL
- Option A: Railway MySQL plugin (easiest — add as a plugin inside your Railway project)
- Option B: Aiven free tier (truly free, 1GB)
- Connection string format: `jdbc:mysql://host:port/foodiehub`

### Elasticsearch
- Bonsai free tier (10k docs — enough for demo): bonsai.io
- OR disable ES sync for the live demo and use MongoDB text search as fallback
- In the interview: "I'd use Elastic Cloud in production"

---

## Step 3 — Environment variables

Every service reads config from env vars. Set these in the Railway dashboard per service.

### user-service
```
DB_URL=jdbc:mysql://host:port/foodiehub
DB_USERNAME=root
DB_PASSWORD=...
REDIS_URL=redis://default:pass@host:port
RABBITMQ_URL=amqps://user:pass@host/vhost
JWT_KEY=...
JWT_EXPIRATION=86400000
REFRESH_TOKEN_EXPIRATION=604800000
GOOGLE_CLIENT_ID=...
GOOGLE_SECRET=...
MAIL_USERNAME=...
MAIL_PASSWORD=...
ADMIN_EMAIL=...
```

### food-service
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/foodiehub_food
RABBITMQ_URL=amqps://user:pass@host/vhost
ELASTICSEARCH_URI=https://your-bonsai-url.bonsai.io
```

### order-service
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/foodiehub_food
REDIS_URL=redis://default:pass@host:port
RABBITMQ_URL=amqps://user:pass@host/vhost
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
```

### notification-service
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/foodiehub_food
RABBITMQ_URL=amqps://user:pass@host/vhost
MAIL_USERNAME=...
MAIL_PASSWORD=...
ADMIN_EMAIL=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
USER_SERVICE_URL=https://your-user-service.up.railway.app
```

### api-gateway
```
JWT_KEY=...
USER_SERVICE_URL=https://your-user-service.up.railway.app
FOOD_SERVICE_URL=https://your-food-service.up.railway.app
ORDER_SERVICE_URL=https://your-order-service.up.railway.app
NOTIFICATION_SERVICE_URL=https://your-notification-service.up.railway.app
REDIS_URL=redis://default:pass@host:port
```

---

## Step 4 — Deploy services to Railway

1. railway.app → New Project → Deploy from GitHub repo
2. Add each service as a separate Railway service
3. Set the root directory per service (e.g. `/order-service`)
4. Railway detects the Dockerfile and builds automatically
5. Set all environment variables in the Railway dashboard
6. Each service gets a public URL: `https://your-service.up.railway.app`

**Internal service communication:**
On Railway, services in the same project communicate via private networking.
Use the Railway internal URL (not the public one) for service-to-service calls to avoid egress charges.

---

## Step 5 — Deploy Angular to Netlify

```bash
# Build for production
ng build --configuration production
# Output: dist/foodiehub-angular/browser/
```

Before building, update the production environment file:
```typescript
// src/environments/environment.production.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-api-gateway.up.railway.app'
};
```

**Deploy:**
1. netlify.com → Add new site → Deploy manually → drag & drop `dist/foodiehub-angular/browser/`
2. OR connect GitHub → build command: `ng build --configuration production`
   → publish directory: `dist/foodiehub-angular/browser`
3. Free URL: `https://foodiehub.netlify.app`

---

## Step 6 — Fix CORS for the live URL

The api-gateway CORS config must allow requests from the Netlify domain.

Update CORS configuration to include the production frontend URL:
```
https://foodiehub.netlify.app
```

---

## Step 7 — End-to-end verification checklist

- [ ] Open the Netlify URL in browser
- [ ] Register a new user → check MySQL has the record
- [ ] Login → JWT returned
- [ ] Browse restaurants → MongoDB Atlas has data (seed it if needed)
- [ ] Add to cart, place order → check CloudAMQP dashboard (message count increases)
- [ ] Check email inbox → order confirmation email arrived
- [ ] Check RabbitMQ management on CloudAMQP → queues are healthy

---

## Realistic timeline

| Task | Estimated time |
|---|---|
| Dockerfiles for all 5 services | 1–2 hours |
| Set up Atlas + Upstash + CloudAMQP + MySQL | 30 min |
| Deploy to Railway, set env vars | 2–3 hours (most time spent debugging config) |
| Deploy Angular to Netlify | 30 min |
| Fix CORS + update Angular env | 1 hour |
| End-to-end test + seed data | 1 hour |
| **Total** | **~1 full day** |

---

## Known challenges

### Elasticsearch on free tier
Most memory-hungry piece. Bonsai free tier has 10k document limit — fine for a demo with seeded data. If it causes issues, disable the ES sync temporarily and fall back to MongoDB text search.

### Railway free credit
$5/month credit. 5 Spring Boot services + infrastructure will use it within 2 weeks. Budget ~$10–15/month to keep the demo running, or take it down after the interview.

### Service cold starts
Railway services don't sleep (unlike Render's free tier). Live demo stays fast. This is why Railway is preferred over Render for this project.

### Service-to-service URLs
When api-gateway routes requests to downstream services, update `application.yaml` to use env vars instead of hardcoded `localhost`:
```yaml
# api-gateway application.yaml routes
uri: ${USER_SERVICE_URL:http://localhost:8081}
```
