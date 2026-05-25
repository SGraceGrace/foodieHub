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

    /** Total order count for a restaurant (all time) */
    long countByRestaurantId(String restaurantId);

    /** Count by status — used for pending orders badge */
    long countByRestaurantIdAndStatusIn(String restaurantId, List<String> statuses);

    /** Available orders for drivers — unassigned (no driverEmail) and in an active status */
    List<Order> findByDriverEmailIsNullAndStatusInOrderByCreatedAtDesc(List<String> statuses);
}
