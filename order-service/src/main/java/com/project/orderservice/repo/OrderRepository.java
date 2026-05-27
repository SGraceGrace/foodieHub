package com.project.orderservice.repo;

import com.project.orderservice.document.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends MongoRepository<Order, String> {

    List<Order> findByUserIdOrderByCreatedAtDesc(String userId);

    /** Live orders for a restaurant filtered by status (no pagination — small list) */
    List<Order> findByRestaurantIdAndStatusInOrderByCreatedAtDesc(
            String restaurantId, List<String> statuses);

    /** All orders for a restaurant — unpaged (used internally when statuses filter is empty) */
    List<Order> findByRestaurantIdOrderByCreatedAtDesc(String restaurantId);

    /** All orders for a restaurant — paginated, no date filter */
    Page<Order> findByRestaurantIdOrderByCreatedAtDesc(String restaurantId, Pageable pageable);

    /** All orders for a restaurant — paginated, with createdAt date range filter */
    Page<Order> findByRestaurantIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            String restaurantId, LocalDateTime from, LocalDateTime to, Pageable pageable);

    // ── Stats queries ─────────────────────────────────────────────────

    /** Today's orders (non-paginated — used only for stats, typically < 100) */
    List<Order> findByRestaurantIdAndCreatedAtBetween(
            String restaurantId, LocalDateTime from, LocalDateTime to);

    /** All orders for a restaurant — used for all-time revenue aggregation */
    List<Order> findByRestaurantId(String restaurantId);

    /** Total order count for a restaurant (all time) */
    long countByRestaurantId(String restaurantId);

    /** Count by status — used for pending orders badge */
    long countByRestaurantIdAndStatusIn(String restaurantId, List<String> statuses);

    /** Available orders for drivers — unassigned (no driverEmail) and in an active status */
    List<Order> findByDriverEmailIsNullAndStatusInOrderByCreatedAtDesc(List<String> statuses);

    /** Driver's own active order — the one order they have claimed but not yet delivered */
    java.util.Optional<Order> findFirstByDriverEmailAndStatusNotInOrderByCreatedAtDesc(
            String driverEmail, List<String> terminalStatuses);

    /** Driver's completed / cancelled delivery history — paginated */
    Page<Order> findByDriverEmailAndStatusInOrderByCreatedAtDesc(
            String driverEmail, List<String> statuses, Pageable pageable);

    /** All DELIVERED orders for a driver within a date range — used for earnings aggregation */
    List<Order> findByDriverEmailAndStatusAndCreatedAtBetween(
            String driverEmail, String status, LocalDateTime from, LocalDateTime to);

    /** All DELIVERED orders for a driver (all time) — used for all-time earnings */
    List<Order> findByDriverEmailAndStatus(String driverEmail, String status);
}
