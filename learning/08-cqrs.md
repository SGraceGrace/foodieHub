# CQRS — Command Query Responsibility Segregation

## What is it?
Separating read operations (queries) from write operations (commands) — potentially using different models, databases, or services for each.

## The core idea
```
Write path:  User places order → validate → save to MongoDB (source of truth)
Read path:   User views orders → read from a denormalized read model (fast, no joins)
```

Reads and writes have different requirements:
- Writes need consistency and validation
- Reads need speed and flexibility (different shapes for different screens)

## You already have CQRS in FoodieHub — call it out

| | Write | Read |
|---|---|---|
| Restaurants | MongoDB (food-service) | Elasticsearch (search) |
| Why | Transactional writes, flexible schema | Full-text search, fast queries |

This IS CQRS. MongoDB is the write model (source of truth), ES is the read model optimised for search.

## Full CQRS would look like this
```
Command:  POST /api/orders         → OrderCommandService → MongoDB
Query:    GET  /api/orders/history → OrderQueryService   → Read-optimised store
```

The read store could be:
- A separate MongoDB collection with denormalized data (no joins needed)
- Redis for frequently accessed data
- A reporting DB like PostgreSQL with materialized views

## How events keep read model in sync
```
OrderCommandService saves order
  → publishes order.placed event to RabbitMQ
    → OrderReadModelUpdater listens
      → updates denormalized read collection:
        { orderId, restaurantName, itemNames, total, status, placedAt }
```

Now the "my orders" page reads from the denormalized collection — one document, no joins, fast.

## Full CQRS vs what FoodieHub needs
Full CQRS adds significant complexity. For a POC:
- You have the core pattern already (MongoDB write + ES read)
- Understand the concept deeply so you can explain it
- Don't implement full separate read models unless you have a specific slow query to fix

## Interview talking points
- "FoodieHub already uses CQRS between the write model (MongoDB) and the search read model (Elasticsearch). Writes go to MongoDB as the source of truth, and the search index in ES is a denormalized read projection optimised for full-text queries"
- "CQRS helps when reads and writes have very different scaling needs — search traffic is much higher than write traffic, so ES scales independently of MongoDB"
- "The trade-off is eventual consistency — after a restaurant updates its menu, the ES index reflects it within seconds but not instantly. For a food delivery app this is acceptable"
- "Full CQRS with separate read models for every feature is usually overkill — I apply it where reads and writes genuinely need different models, not as a blanket pattern"

## What to implement in FoodieHub
- [ ] Nothing new to build — you already have this pattern
- [ ] Add a comment in RestaurantServiceImpl explaining the CQRS intent
- [ ] Draw the write vs read path in your README architecture diagram
- [ ] Be ready to whiteboard: write path (save → index) and read path (ES search)
