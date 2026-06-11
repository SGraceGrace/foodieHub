# FoodieHub — Pending Work

> Last updated: 2026-06-11
> Overall status: ~90% complete. All core services are built and wired. Remaining work is feature gaps, UI stubs, and polish.

---

## Priority Legend

| Symbol | Meaning |
|--------|---------|
| 🔴 HIGH | Blocks demo / interview readiness |
| 🟡 MEDIUM | Visible gap in the app |
| 🟢 LOW | Nice to have, can skip for MVP |

---

## 1. Infrastructure & Deployment

| # | Task | Status | Detail |
|---|------|--------|--------|
| 1.1 | **`docker-compose.yml`** at project root | ✅ Done | Starts all 5 app services + MySQL, MongoDB, Redis, RabbitMQ, Elasticsearch with health checks and `depends_on` |
| 1.2 | **Dockerfile** for each service | ✅ Done | All 6 Dockerfiles exist (api-gateway, user-service, food-service, order-service, notification-service, frontend). Frontend updated to support `BUILD_CONFIGURATION` arg |
| 1.3 | **`.env.example`** template | ✅ Done | All required variables documented with descriptions |
| 1.4 | **`.dockerignore`** for each service | ✅ Done | Prevents `target/` and `node_modules/` from bloating build context |
| 1.5 | **Render deployment config** 🔴 | ❌ Pending | `render.yaml` or manual setup guide so the live demo URL exists for Wellfound/LinkedIn |

---

## 2. Wishlist Feature ✅ Done

The wishlist is linked from the header nav and the profile sidebar, but clicking it leads to a blank page. Both backend and frontend are 0% implemented.

### 2.1 What exists right now

| Layer | State |
|-------|-------|
| Frontend component | `wishlist.component.ts` — empty shell, `<p>wishlist works!</p>` placeholder |
| Frontend service | None — no `WishlistService` exists |
| Backend API | None — zero endpoints in any service |
| Database model | None — no collection or table |
| Navigation links | Exist in header + profile page (routes to `/user/wishlist`) |

### 2.2 Backend work needed (food-service)

**New MongoDB collection: `wishlists`**
```
{
  userId: string,          ← from X-User-Id header (gateway-injected)
  restaurantId: string,
  addedAt: date
}
Index: { userId, restaurantId } unique
```

**New endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/wishlist` | Get all saved restaurants for the logged-in user (paginated, with restaurant details joined) |
| `POST` | `/api/v1/wishlist/{restaurantId}` | Add restaurant to wishlist |
| `DELETE` | `/api/v1/wishlist/{restaurantId}` | Remove from wishlist |
| `GET` | `/api/v1/wishlist/{restaurantId}/status` | Check if a specific restaurant is wishlisted (returns `{ saved: true/false }`) — used to set the heart icon state |

All routes must be added to `api-gateway/resources/application.yaml`.

### 2.3 Frontend work needed

**`WishlistService` (`core/services/wishlist.service.ts`)**
- `getWishlist(page, size)` → `Observable<ApiResponse<PaginatedResponse<Restaurant>>>`
- `addToWishlist(restaurantId)` → `Observable<ApiResponse<void>>`
- `removeFromWishlist(restaurantId)` → `Observable<ApiResponse<void>>`
- `checkWishlistStatus(restaurantId)` → `Observable<ApiResponse<{ saved: boolean }>>`

**`WishlistComponent` (`user/wishlist/`)**
- Fetch and display saved restaurants using the same card used on the home page
- Heart/remove button per card
- Pagination (follow the project pagination convention: `PaginatedResponse<T>`, prev/next, "Showing X–Y of Z")
- Empty state: "No saved restaurants yet" with a link to browse

**Heart icon on restaurant cards (home page + restaurant detail)**
- On load, call `checkWishlistStatus(restaurantId)` to fill/unfill the heart
- On click: toggle `addToWishlist` / `removeFromWishlist`
- Show toast on success/failure (use existing `ToastrService`)
- Guard: if not logged in, redirect to login

---

## 3. Admin Dashboard — Tabs Without Data 🟡

The admin component has 12 tabs defined. 7 are wired to real APIs. 5 are stubs.

### 3.1 Tabs currently wired ✓

| Tab | API |
|-----|-----|
| Users | `GET /api/v1/admin/users` — list, search, suspend/unsuspend |
| Restaurants | `GET /api/v1/admin/restaurants` — list with filters |
| Restaurant Owners | `GET /api/v1/admin/restaurant-owners` — approve/reject |
| Drivers | `GET /api/v1/admin/drivers` — approve/reject |
| Contact Messages | `GET /api/v1/admin/contact-messages` — read/unread |
| Activity Logs | `GET /api/v1/admin/activity-logs` |
| Slides | `GET/POST/PUT/DELETE /api/v1/admin/slides` |

### 3.2 Tabs that are stubs (no load function, no UI) 🟡

| Tab | What's needed |
|-----|---------------|
| **Dashboard (summary)** | Stats cards: total users, total orders today, total revenue today, pending approvals count. Pull from existing endpoints or add a dedicated `/api/v1/admin/stats` endpoint |
| **Orders** | Paginated all-orders list across all restaurants with date/status filter. Needs new backend endpoint: `GET /api/v1/admin/orders` in order-service (proxy through gateway) |
| **Payments** | Transaction history list with Razorpay payment ID, amount, status. Needs new backend endpoint or expose order payment fields |
| **Reports** | Revenue charts (daily/weekly/monthly). Can be computed from orders data. Low priority — static charts are fine for MVP |
| **Support** | Duplicate of Contact Messages or a separate ticket system — clarify which is intended |

---

## 4. Deals / Promotions Feature — Stub 🟡

Frontend `DealsComponent` is a placeholder (`<p>deals works!</p>`). No backend exists.

### What's needed

**Decision first:** Decide the scope — coupon codes only, or a full promotions system?

**Minimal MVP approach (coupon codes):**

Backend (order-service):
- `POST /api/v1/coupons/validate` — validate a code, return discount amount/percentage
- `POST /api/v1/admin/coupons` — create coupon (admin only)
- `GET /api/v1/admin/coupons` — list all coupons (admin only)

Frontend:
- `DealsComponent` — show active promotions/coupons
- Coupon code input field in `CartComponent` at checkout

---

## 5. Blog Page ✅ Done

4 static articles: "How FoodieHub Works", "Why Microservices", "Our Story", "Tech Behind Real-Time Tracking".
Expand/collapse per article. Matches project design system (Libre Baskerville + DM Sans, gold palette).

---

## 6. Testing 🟢

No tests are written anywhere in the project.

| Scope | Minimum needed |
|-------|----------------|
| User Service | Happy path unit test for `AuthService.register()` and `AuthService.login()` |
| Food Service | Happy path unit test for `RestaurantService.getRestaurants()` |
| Order Service | Happy path unit test for `OrderService.placeOrder()` |
| Angular | One component spec for `HomeComponent` to prove test runner works |

Full coverage is not the goal — just enough to show you understand how to test.

---

## 7. Documentation 🟢

| Task | Detail |
|------|--------|
| **Swagger / OpenAPI** | Add `springdoc-openapi-ui` to each service. Accessible at `/swagger-ui.html`. Very quick to add. |
| **README architecture diagram** | Add a visual architecture diagram (draw.io or ASCII) to the root `README.md` — required for whiteboard interview prep |
| **Postman collection** | Export a Postman collection covering all major endpoints. Include in `/docs` folder |

---

## 8. End-to-End Verification Checklist 🔴

Before calling the project interview-ready, walk through every journey manually:

### Customer journey
- [ ] Register with email/password
- [ ] Register / login with Google OAuth2
- [ ] Browse home page — restaurants load from MongoDB
- [ ] Filter by cuisine
- [ ] Search by dish name (Elasticsearch)
- [ ] Open a restaurant, view full menu
- [ ] Add item to cart
- [ ] Add item from a second restaurant — confirm conflict/replace flow
- [ ] Checkout — Razorpay modal opens
- [ ] Complete payment — order created
- [ ] Receive browser push notification (Web Push, tab closed)
- [ ] Track order status in real time (SSE)
- [ ] Rate the delivered order — restaurant rating updates

### Partner journey
- [ ] Register as restaurant owner
- [ ] Admin approves the owner
- [ ] Login to partner workspace
- [ ] Receive real-time SSE notification when order arrives
- [ ] Update order status through full workflow
- [ ] View today's stats

### Driver journey
- [ ] Register as driver
- [ ] Admin approves the driver
- [ ] Login to driver dashboard
- [ ] Accept an available order
- [ ] Update status to OUT_FOR_DELIVERY → DELIVERED
- [ ] View earnings summary

### Admin journey
- [ ] Login to admin panel
- [ ] View and suspend a user
- [ ] Approve a restaurant owner application
- [ ] Approve a driver application
- [ ] Manage promotional slides

---

## Summary

| Area | Status | Effort estimate |
|------|--------|-----------------|
| Docker Compose + Dockerfiles | ❌ Missing | ~4 hours |
| Wishlist feature (full) | ❌ Missing | ~1–2 days |
| Admin dashboard gaps (Orders, Payments, Stats) | ⚠️ Partial | ~1 day |
| Deals / Coupon system | ❌ Missing | ~1 day |
| Blog page (static) | ❌ Missing | ~1 hour |
| Swagger docs | ❌ Missing | ~2 hours |
| Basic unit tests | ❌ Missing | ~4 hours |
| Render deployment | ❌ Missing | ~3 hours |
| E2E verification | ❌ Not done | ~2 hours |

**Estimated time to interview-ready:** 3–4 focused days covering items 1, 2, and the E2E checklist.
