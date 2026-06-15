# FoodieHub — Pending Work

> Last updated: 2026-06-15
> Overall status: ~95% complete. All core services built, secured, and documented. Remaining work is feature gaps and polish.

---

## Priority Legend

| Symbol | Meaning |
|--------|---------|
| 🔴 HIGH | Blocks demo / interview readiness |
| 🟡 MEDIUM | Visible gap in the app |
| 🟢 LOW | Nice to have, can skip for MVP |

---

## 1. Infrastructure & Deployment ✅ Done

| # | Task | Status |
|---|------|--------|
| 1.1 | `docker-compose.yml` at project root | ✅ Done |
| 1.2 | Dockerfile for each service | ✅ Done |
| 1.3 | `.env.example` template | ✅ Done |
| 1.4 | `.dockerignore` for each service | ✅ Done |
| 1.5 | `render.yaml` Blueprint config | ✅ Done |

---

## 2. Wishlist Feature ✅ Done

Backend (food-service): GET/POST/DELETE `/api/v1/wishlist`, status check endpoint.
Frontend: WishlistComponent with pagination, heart toggle on restaurant cards, toast feedback.

---

## 3. Admin Dashboard ⚠️ Mostly Done

| Tab | Status |
|-----|--------|
| Users | ✅ Wired |
| Restaurants | ✅ Wired |
| Restaurant Owners | ✅ Wired |
| Drivers | ✅ Wired |
| Contact Messages | ✅ Wired |
| Activity Logs | ✅ Wired |
| Slides | ✅ Wired |
| Dashboard (stats) | ✅ Done — stat cards + recent orders + pending approvals |
| Orders | ✅ Done — paginated with status filter |
| Payments | ✅ Done — shows Razorpay paymentId + status from orders |
| Support | ✅ Done — redirects to Contact Messages tab |
| Reports | 🟢 Skipped — revenue charts, low priority for MVP |

---

## 4. Deals / Promotions Feature ✅ Done

Backend (order-service): `GET /api/v1/coupons/active`, `POST /api/v1/coupons/validate`, `POST /api/v1/admin/coupons`, `GET /api/v1/admin/coupons`.
Frontend: `DealsComponent` with coupon cards + copy button. `CartComponent` coupon input, applied badge, discount in bill. Razorpay flow carries couponCode + discountAmount through to order creation.

---

## 5. Blog Page ✅ Done

4 static articles with expand/collapse. Matches project design system.

---

## 6. Security ✅ Done

| Layer | Status |
|-------|--------|
| API Gateway — JWT validation | ✅ Done — validates token, injects X-User-Id + X-User-Role |
| User Service — Spring Security | ✅ Done — full JWT auth, OAuth2, @PreAuthorize |
| Food Service — Spring Security | ✅ Done — HeaderAuthFilter + @PreAuthorize on all endpoints |
| Order Service — Spring Security | ✅ Done — HeaderAuthFilter + @PreAuthorize on all endpoints |
| Notification Service — Spring Security | ✅ Done — HeaderAuthFilter + @PreAuthorize on all endpoints |

---

## 7. API Documentation ✅ Done

Swagger UI added to all 4 backend services (springdoc-openapi-starter-webmvc-ui 2.6.0).
Bearer Token + X-User-Id + X-User-Role header inputs available in Swagger Authorize dialog.

| Service | URL |
|---------|-----|
| User Service | http://localhost:8081/swagger-ui.html |
| Food Service | http://localhost:8082/swagger-ui.html |
| Order Service | http://localhost:8083/swagger-ui.html |
| Notification Service | http://localhost:8084/swagger-ui.html |

Postman collection — 🟢 Not done (Swagger covers this for MVP).

---

## 8. Testing 🟢

No tests written. Minimum needed for portfolio:

| Scope | Test |
|-------|------|
| User Service | Happy path: `AuthService.register()` and `AuthService.login()` |
| Food Service | Happy path: `RestaurantService.getAll()` |
| Order Service | Happy path: `OrderService.placeOrder()` |
| Angular | One component spec for `HomeComponent` |

---

## 9. End-to-End Verification Checklist 🔴

Before calling the project interview-ready, walk through every journey manually:

### Customer journey
- [ ] Register with email/password
- [ ] Login with Google OAuth2
- [ ] Browse home page — restaurants load from MongoDB
- [ ] Filter by cuisine, search by dish name (Elasticsearch)
- [ ] Open a restaurant, view full menu
- [ ] Add item to cart, checkout via Razorpay
- [ ] Receive browser push notification (Web Push)
- [ ] Track order status in real time (SSE)
- [ ] Rate the delivered order

### Partner journey
- [ ] Register as restaurant owner → admin approves
- [ ] Receive SSE notification when order arrives
- [ ] Update order status through full workflow
- [ ] View today's stats

### Driver journey
- [ ] Register as driver → admin approves
- [ ] Accept an available order
- [ ] Update to OUT_FOR_DELIVERY → DELIVERED
- [ ] View earnings summary

### Admin journey
- [ ] View and suspend a user
- [ ] Approve restaurant owner + driver applications
- [ ] Manage promotional slides

---

## Summary

| Area | Status |
|------|--------|
| Infrastructure + Deployment | ✅ Done |
| Wishlist feature | ✅ Done |
| Admin dashboard | ✅ Done (Reports skipped) |
| Blog page | ✅ Done |
| Security (@PreAuthorize all services) | ✅ Done |
| Swagger / OpenAPI | ✅ Done |
| Deals / Coupon system | ✅ Done — DealsComponent + CartComponent coupon input + order-service backend |
| Basic unit tests | 🟢 Not done |
| E2E verification (manual walkthrough) | 🔴 Not done |
