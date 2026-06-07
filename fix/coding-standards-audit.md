# FoodieHub — Coding Standards Audit

## ✅ What's Correct

| Standard | Status |
|---|---|
| `BaseAPIResponse` wrapper | Present in all 4 services |
| `PaginatedResponse<T>` DTO | Present in all 4 services |
| Service interface + `impl` pattern | Followed in all services |
| `@RequiredArgsConstructor` + field injection | Consistent everywhere |
| Pagination on list endpoints (food-service, order-service) | Correct — `@RequestParam page/size` + `PageRequest.of(page, size)` |
| `BaseEntity` in user-service | Present |
| Enums for status values | Used correctly |

---

## ❌ Issues Found

### 1. GlobalExceptionHandler missing in 3 services

Only `foodieHub` (user-service) has `GlobalExceptionHandler.java`. The other three are completely missing it.

| Service | Has GlobalExceptionHandler? |
|---|---|
| user-service (foodieHub) | ✅ Yes |
| food-service | ❌ Missing |
| order-service | ❌ Missing |
| notification-service | ❌ Missing |

**Fix:** Add a `GlobalExceptionHandler` annotated with `@RestControllerAdvice` in each missing service. It should handle at minimum:
- Custom domain exceptions (e.g. `ResourceNotFoundException`, `DuplicateRatingException`)
- `MethodArgumentNotValidException` → 400
- `ConstraintViolationException` → 400
- Catch-all `Exception` → 500

---

### 2. Try-catch inside controller (food-service)

**File:** `food-service/.../controller/RestaurantController.java` — lines 112–119

```java
// ❌ Bad — error handling inside controller method
try {
    return ResponseEntity.ok(new BaseAPIResponse("SUCCESS",
            restaurantService.addRating(...),
            HttpStatus.OK.value(), null));
} catch (IllegalStateException e) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new BaseAPIResponse("ERROR", null, HttpStatus.CONFLICT.value(), List.of(e.getMessage())));
}
```

**Fix:** Create a `DuplicateRatingException` (or similar custom exception), throw it from `RestaurantServiceImpl`, and map it in `GlobalExceptionHandler`. The controller method becomes a clean one-liner.

---

### 3. `ResponseStatusException` leaking into the service layer (order-service)

**File:** `order-service/.../service/impl/OrderServiceImpl.java` — lines 73, 177, 274, 280

```java
// ❌ Bad — Spring MVC class used inside business logic
throw new ResponseStatusException(HttpStatus.CONFLICT, "Order already accepted");
throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty for this restaurant");
throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
```

`ResponseStatusException` is a Spring MVC concern and should not appear in the service layer.

**Fix:** Create custom exceptions (e.g. `OrderConflictException`, `CartEmptyException`, `AccessDeniedException`) in an `exception` package, throw them from the service, and handle them in `GlobalExceptionHandler`.

---

### 4. `CommonConstants` exists but is barely used

**File:** `foodieHub/.../constants/CommonConstants.java`

```java
public static final String SUCCESS = "Success";
```

This constant is defined but only **one controller** (`RefreshTokenController`) actually imports and uses it. All other user-service controllers hardcode `"SUCCESS"` as a raw string literal.

**Files with hardcoded "SUCCESS" in user-service:**
- `AdminUserController.java`
- `UserController.java`
- `PartnerController.java`
- `ContactMessageController.java`
- `UserAddressController.java`

**Fix:** Import and use `CommonConstants.SUCCESS` consistently across all controllers in user-service.

---

### 5. No constants class in food-service, order-service, notification-service

All three services have status strings scattered across controllers as raw literals with no central constants file.

**Hardcoded literals found:**

| Service | Hardcoded strings |
|---|---|
| food-service | `"SUCCESS"`, `"ERROR"` |
| order-service | `"SUCCESS"`, `"ORDER_PLACED"`, `"STATUS_UPDATED"`, `"ORDER_ACCEPTED"` |
| notification-service | `"SUCCESS"`, `"Notification dismissed"` |

**Fix:** Add a `CommonConstants.java` to each service's `constants` package:

```java
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class CommonConstants {
    public static final String SUCCESS        = "Success";
    public static final String ORDER_PLACED   = "Order placed";
    public static final String STATUS_UPDATED = "Status updated";
    public static final String ORDER_ACCEPTED = "Order accepted";
}
```

Then replace all raw string literals in controllers with references to these constants.

---

## Fix Priority

| Priority | Fix |
|---|---|
| High | Add `GlobalExceptionHandler` to food-service, order-service, notification-service |
| High | Remove try-catch from `RestaurantController` — use custom exception instead |
| High | Replace `ResponseStatusException` in `OrderServiceImpl` with custom exceptions |
| Medium | Add `CommonConstants.java` to food-service, order-service, notification-service |
| Low | Use `CommonConstants.SUCCESS` consistently in user-service controllers |
