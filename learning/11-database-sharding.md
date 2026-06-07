# Database Sharding

## What is it?
Splitting a database horizontally across multiple machines — each machine (shard) holds a subset of the data. No single machine has all the rows.

```
Without sharding:  one MongoDB node → all restaurants (Chennai, Mumbai, Delhi, Bangalore)

With sharding:
  Shard 1 → Chennai restaurants
  Shard 2 → Mumbai restaurants
  Shard 3 → Delhi restaurants
  Shard 4 → Bangalore restaurants
```

## Why a single machine eventually breaks
- **Storage** — one node runs out of disk
- **Write throughput** — a single primary can only handle so many writes/sec
- **Read throughput** — even with replicas, reads hit the same dataset

Replication (adding read replicas) solves read scaling but not write scaling or storage. Sharding solves all three.

## Shard key — the most important decision
The shard key determines which shard a document goes to. A bad shard key causes hotspots (one shard gets all the traffic while others sit idle).

### In FoodieHub — restaurants sharded by city
```
shard key: city

Write: "Spice Garden, Chennai" → hash("Chennai") → Shard 1
Read:  GET /restaurants?city=Chennai → query only Shard 1 (not all shards)
```

**Good shard key properties:**
- High cardinality (many distinct values) — city works, boolean doesn't
- Even distribution — avoids hotspots
- Matches your query patterns — if you always filter by city, shard by city

### Bad shard key example
```
shard key: cuisine

"Indian" cuisine → 60% of all restaurants → Shard 1 is a hotspot
"Korean" cuisine → 2% of restaurants      → Shard 3 is idle
```

## Types of sharding

### Range-based
```
userId 1–1000000    → Shard 1
userId 1000001–2000000 → Shard 2
```
Simple, but can cause hotspots if new IDs are always at the high end.

### Hash-based
```
hash(userId) % 4 → determines shard
```
Even distribution, but range queries hit all shards.

### Directory-based
A lookup table maps keys to shards. Flexible but the lookup table is a bottleneck.

## MongoDB sharding (built-in)
MongoDB has native sharding via `mongos` (query router):
```
Client → mongos (query router) → Config Server (shard map)
                               → Shard 1 / Shard 2 / Shard 3
```
The application talks to `mongos` — it looks identical to a regular MongoDB connection. The routing is transparent.

```js
// Enable sharding on the collection
sh.shardCollection("foodiehub_food.restaurants", { city: "hashed" })
```

## The cross-shard query problem
```
GET /restaurants?rating=4.5   ← no city filter
→ mongos must query ALL shards and merge results
→ slower, more expensive
```
This is called a **scatter-gather** query. Avoid it by ensuring your most common queries include the shard key.

In FoodieHub: always filter by city/geolocation → queries hit 1–2 shards, not all.

## Sharding vs Replication — when to use which

| Problem | Solution |
|---|---|
| Read throughput too high | Add read replicas (replication) |
| Write throughput too high | Shard |
| Storage full | Shard |
| High availability / failover | Replication |

Most production systems use both: sharding for scale + replication within each shard for availability.

## Interview talking points
- "For FoodieHub at scale, I'd shard the restaurants collection by city — it's high cardinality, evenly distributed across major cities, and matches the query pattern where users always filter by location"
- "MongoDB has native sharding via mongos — the application connection string doesn't change. The query router handles shard selection transparently"
- "The risk with sharding is cross-shard queries — if you query without the shard key, mongos has to hit every shard and merge results. That's why shard key selection is the most important architectural decision"
- "Sharding solves write scaling and storage; replication solves read scaling and availability. At scale you need both — shard across machines, replicate within each shard"
- "I'd only add sharding when actually needed — it adds operational complexity. Vertical scaling and read replicas come first"

## What to implement in FoodieHub
- [ ] Not needed for POC — single MongoDB node is fine
- [ ] For the interview: be ready to explain which collection you'd shard first (restaurants), what shard key you'd choose (city or geohash), and why
- [ ] Talking point: geolocation-based queries already filter by location — this naturally aligns with a city/region shard key, so adding sharding later would be low-risk
