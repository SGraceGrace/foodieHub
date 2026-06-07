# Pagination Deep Dive

## What is it?
Breaking large result sets into pages so the API returns a bounded number of records per request. Every list endpoint must be paginated — returning all records is a performance and memory bomb.

## Two fundamentally different approaches

### Offset pagination — what FoodieHub uses
```
GET /api/v1/restaurants?page=0&size=10
GET /api/v1/restaurants?page=1&size=10   ← skip 10, take 10
GET /api/v1/restaurants?page=2&size=10   ← skip 20, take 10
```

**How it works in MongoDB:**
```
db.restaurants.find().skip(20).limit(10)
```

**How it works in Spring Data:**
```java
Page<Restaurant> page = repo.findAll(PageRequest.of(page, size));
// Spring Data translates to: skip(page * size).limit(size)
```

**Response shape (PaginatedResponse<T> in FoodieHub):**
```json
{
  "content": [...],
  "currentPage": 2,
  "totalPages": 15,
  "totalElements": 147,
  "pageSize": 10
}
```

---

### Cursor-based pagination (keyset pagination)
```
GET /api/v1/restaurants               → returns first 10 + cursor: "eyJpZCI6IjEwIn0="
GET /api/v1/restaurants?cursor=eyJ... → returns next 10 + new cursor
```

**How it works:**
```
Instead of SKIP, remember the last seen value:

Page 1: find().limit(10)                          → last id = "abc"
Page 2: find({ _id: { $gt: "abc" } }).limit(10)  → no SKIP needed
Page 3: find({ _id: { $gt: "xyz" } }).limit(10)
```

The cursor encodes the last seen record's position (usually the ID or a sort key).

---

## Why offset breaks at scale

### The SKIP performance problem
```
Page 1:  skip(0).limit(10)    → reads 10 docs     → fast
Page 10: skip(90).limit(10)   → reads 100 docs, discards 90 → wasteful
Page 100: skip(990).limit(10) → reads 1000 docs, discards 990 → very slow
Page 500: skip(4990).limit(10) → reads 5000 docs, discards 4990 → DB under load
```

MongoDB (and most DBs) must scan and discard all the skipped rows. Deep pages are slow.

### The phantom record problem
```
User is on page 2 (records 11-20)
Meanwhile: a new restaurant is added at position 5

User goes to page 3 → record 21 has shifted → they see a restaurant they already saw on page 2
Or: a restaurant is deleted → they skip a record entirely
```

Offset pagination is unstable under concurrent writes.

---

## When to use which

| | Offset | Cursor |
|---|---|---|
| Simple to implement | ✅ | ❌ (more complex) |
| Jump to page N | ✅ | ❌ (must walk from start) |
| Total count available | ✅ | ❌ (expensive or approximate) |
| Stable under concurrent writes | ❌ | ✅ |
| Deep pages perform well | ❌ | ✅ |
| Infinite scroll / "load more" | ❌ | ✅ |
| Admin tables with page numbers | ✅ | ❌ |

---

## FoodieHub — what uses pagination

All list endpoints are paginated with offset pagination:

| Endpoint | Page size | Notes |
|---|---|---|
| `GET /api/v1/restaurants` | 10 | Restaurant listing |
| `GET /api/orders` | 10 | Order history |
| `GET /api/v1/admin/users` | 10 | Admin user table |
| Restaurant all-orders | 10 | Partner workspace history tab |
| Driver history | 10 | Driver earnings history |

---

## The `content ?? []` guard — why it matters

```typescript
// WRONG — crashes if content is undefined (API returned null or empty page)
this.restaurants = page.content;

// RIGHT — always assign a safe default
this.restaurants = page.content ?? [];
```

Spring Data returns `content: []` for empty pages, but defensive coding prevents crashes if the API shape ever changes or a null slips through.

---

## Implementing cursor pagination in FoodieHub (for order history)

Order history is a natural candidate — users scroll down to see older orders. New orders are always added at the top. Offset would show duplicates if a new order is placed while paginating.

```java
// Cursor = last seen createdAt + orderId (to handle ties)
public List<Order> getOrderHistoryCursor(String userId, String cursor, int size) {
    if (cursor == null) {
        // First page — no cursor
        return orderRepo.findByUserIdOrderByCreatedAtDesc(userId, Pageable.ofSize(size));
    }
    // Decode cursor → extract createdAt
    LocalDateTime cursorTime = decodeCursor(cursor);
    return orderRepo.findByUserIdAndCreatedAtBeforeOrderByCreatedAtDesc(userId, cursorTime, Pageable.ofSize(size));
}

// Response includes next cursor
String nextCursor = orders.isEmpty() ? null : encodeCursor(orders.get(orders.size() - 1).getCreatedAt());
```

Angular "Load more" button sends the cursor from the previous response:
```typescript
loadMore() {
  this.orderService.getOrders(this.nextCursor).subscribe(res => {
    this.orders.push(...res.content);
    this.nextCursor = res.nextCursor;
  });
}
```

---

## Interview talking points
- "FoodieHub uses offset pagination on all list endpoints. It's simple and sufficient for the POC — the admin tables and order history have at most a few hundred records"
- "Offset breaks at scale for two reasons: deep pages require scanning and discarding thousands of records (SKIP is expensive), and concurrent writes make pages unstable — records shift between requests"
- "For order history I'd switch to cursor-based pagination in production — users always scroll forward through time, they never jump to page 47. Cursor pagination is O(1) regardless of how deep you go"
- "The cursor encodes the last seen value, usually a timestamp or ID. The next query uses `WHERE createdAt < cursor` instead of SKIP — the DB uses an index and skips nothing"
- "Admin tables are the one place offset pagination is the right call — admins need 'jump to page 5', they need total counts, and they're not paginating through millions of records"

## What to implement in FoodieHub
- [ ] Current offset pagination is correct for POC — no change needed
- [ ] For production: switch `GET /api/orders` (order history) to cursor-based — it's a natural "load more" pattern and new orders arrive frequently
- [ ] For the interview: be ready to whiteboard both approaches and explain the SKIP performance problem
