package com.project.orderservice.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.orderservice.document.Cart;
import com.project.orderservice.document.Order;
import com.project.orderservice.document.OrderItem;
import com.project.orderservice.document.RestaurantCart;
import com.project.orderservice.dto.PaginatedResponse;
import com.project.orderservice.dto.PlaceOrderRequest;
import com.project.orderservice.messaging.OrderCancelledEvent;
import com.project.orderservice.messaging.OrderItemEvent;
import com.project.orderservice.messaging.OrderPlacedEvent;
import com.project.orderservice.messaging.OrderStatusUpdatedEvent;
import com.project.orderservice.messaging.RabbitMQConfig;
import com.project.orderservice.outbox.OutboxEvent;
import com.project.orderservice.outbox.OutboxEventRepository;
import com.project.orderservice.repo.CartRepository;
import com.project.orderservice.repo.OrderRepository;
import com.project.orderservice.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.StringRedisTemplate;
import com.project.orderservice.exception.AccessDeniedException;
import com.project.orderservice.exception.CartEmptyException;
import com.project.orderservice.exception.OrderConflictException;
import com.project.orderservice.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import com.project.orderservice.dto.AdminStatsDTO;
import com.project.orderservice.dto.DriverEarningsDTO;
import com.project.orderservice.dto.RestaurantStatsDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.Duration;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private static final double DELIVERY_FEE        = 30.0;
    private static final double FREE_DELIVERY_ABOVE = 500.0;
    private static final double GST_RATE            = 0.05;

    private final CartRepository        cartRepository;
    private final OrderRepository       orderRepository;
    private final RabbitTemplate        rabbitTemplate;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper          objectMapper;
    private final StringRedisTemplate   redisTemplate;

    @Override
    public Order placeOrder(String userId, PlaceOrderRequest req) {
        String lockKey   = "lock:order:" + userId;
        String lockValue = UUID.randomUUID().toString();
        Boolean acquired = redisTemplate.opsForValue()
                .setIfAbsent(lockKey, lockValue, Duration.ofSeconds(10));

        if (!Boolean.TRUE.equals(acquired)) {
            throw new OrderConflictException("Order already being processed, please wait");
        }

        try {
            return doPlaceOrder(userId, req);
        } finally {
            String current = redisTemplate.opsForValue().get(lockKey);
            if (lockValue.equals(current)) {
                redisTemplate.delete(lockKey);
            }
        }
    }

    private Order doPlaceOrder(String userId, PlaceOrderRequest req) {

        // 1. Fetch cart
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new CartEmptyException("Cart is empty"));

        // 2. Find the restaurant bucket
        RestaurantCart rc = cart.getRestaurants().stream()
                .filter(r -> r.getRestaurantId().equals(req.getRestaurantId()))
                .findFirst()
                .orElseThrow(() -> new CartEmptyException(
                        "No items found for restaurant: " + req.getRestaurantId()));

        if (rc.getItems().isEmpty()) {
            throw new CartEmptyException("Cart is empty for this restaurant");
        }

        // 3. Map cart items → order items & compute bill
        List<OrderItem> orderItems = rc.getItems().stream().map(ci -> {
            OrderItem oi = new OrderItem();
            oi.setMenuItemId(ci.getMenuItemId());   // carries menuItemId for food-service analytics
            oi.setName(ci.getName());
            oi.setPrice(ci.getPrice());
            oi.setQty(ci.getQty());
            oi.setVeg(ci.isVeg());
            return oi;
        }).collect(Collectors.toList());

        double subtotal    = rc.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQty()).sum();
        double deliveryFee = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
        double gst         = Math.round(subtotal * GST_RATE);
        double total       = subtotal + deliveryFee + gst;

        // 4. Build & persist Order
        Order order = new Order();
        order.setUserId(userId);
        order.setCustomerName(req.getCustomerName() != null ? req.getCustomerName() : "Customer");
        order.setRestaurantId(rc.getRestaurantId());
        order.setRestaurantName(rc.getRestaurantName());
        order.setItems(orderItems);
        order.setSubtotal(subtotal);
        order.setDeliveryFee(deliveryFee);
        order.setGst(gst);
        order.setTotalAmount(total);
        order.setDeliveryAddress(req.getDeliveryAddress());
        order.setRestaurantEarnings(subtotal);   // restaurant keeps the food value; delivery fee + GST stay with platform
        order.setStatus("PLACED");
        order.setUpdatedAt(LocalDateTime.now());
        if (req.getPaymentId() != null && !req.getPaymentId().isBlank()) {
            order.setPaymentId(req.getPaymentId());
            order.setPaymentStatus("PAID");
        }
        Order saved = orderRepository.save(order);

        // 5. Clear that restaurant from cart
        cart.getRestaurants().removeIf(r -> r.getRestaurantId().equals(req.getRestaurantId()));
        cart.setUpdatedAt(LocalDateTime.now());
        if (cart.getRestaurants().isEmpty()) {
            cartRepository.delete(cart);
        } else {
            cartRepository.save(cart);
        }

        // 6. Publish order.placed event → RabbitMQ → notification-service + food-service
        // itemNames: human-readable list used by notification-service for the confirmation email
        List<String> itemNames = orderItems.stream()
                .map(i -> i.getName() + " x" + i.getQty())
                .collect(Collectors.toList());

        // items: full list with menuItemId used by food-service to increment order counts
        List<OrderItemEvent> itemEvents = orderItems.stream()
                .map(i -> new OrderItemEvent(i.getMenuItemId(), i.getName(), i.getQty(), i.getPrice()))
                .collect(Collectors.toList());

        OrderPlacedEvent event = OrderPlacedEvent.builder()
                .orderId(saved.getId())
                .userId(userId)
                .customerEmail(userId)          // X-User-Id is the email
                .customerName(saved.getCustomerName())
                .restaurantId(saved.getRestaurantId())
                .restaurantName(saved.getRestaurantName())
                .totalAmount(total)
                .items(itemEvents)
                .itemNames(itemNames)
                .deliveryAddress(req.getDeliveryAddress())
                .placedAt(saved.getCreatedAt())
                .build();

        // Write to outbox instead of publishing directly — guarantees the event survives
        // even if RabbitMQ is temporarily down. OutboxPoller delivers it within 5 seconds.
        try {
            OutboxEvent outbox = new OutboxEvent();
            outbox.setAggregateId(saved.getId());
            outbox.setEventType("order.placed");
            outbox.setExchange(RabbitMQConfig.EXCHANGE);
            outbox.setRoutingKey(RabbitMQConfig.ORDER_PLACED_RKEY);
            outbox.setPayloadClass(OrderPlacedEvent.class.getName());
            outbox.setPayloadJson(objectMapper.writeValueAsString(event));
            outbox.setSent(false);
            outboxEventRepository.save(outbox);
            log.info("Outbox event saved for orderId={}", saved.getId());
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize OrderPlacedEvent for orderId={}", saved.getId(), e);
        }

        return saved;
    }

    @Override
    public List<Order> getOrderHistory(String userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public Order getOrder(String userId, String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!order.getUserId().equals(userId)) {
            throw new AccessDeniedException("Access denied");
        }
        return order;
    }

    @Override
    public List<Order> getRestaurantOrders(String restaurantId, List<String> statuses) {
        if (statuses == null || statuses.isEmpty()) {
            return orderRepository.findByRestaurantIdOrderByCreatedAtDesc(restaurantId);
        }
        return orderRepository.findByRestaurantIdAndStatusInOrderByCreatedAtDesc(restaurantId, statuses);
    }

    @Override
    public PaginatedResponse<Order> getRestaurantAllOrders(
            String restaurantId, int page, int size, LocalDateTime from, LocalDateTime to) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        if (from != null && to != null) {
            return PaginatedResponse.of(
                    orderRepository.findByRestaurantIdAndCreatedAtBetweenOrderByCreatedAtDesc(
                            restaurantId, from, to, pageable)
            );
        }
        return PaginatedResponse.of(
                orderRepository.findByRestaurantIdOrderByCreatedAtDesc(restaurantId, pageable)
        );
    }

    // Statuses at which an order is visible to drivers as "available to pick up".
    // PLACED is included so drivers can see incoming orders, but acceptOrder() blocks
    // claiming until the restaurant confirms (status moves to CONFIRMED or beyond).
    private static final List<String> AVAILABLE_STATUSES =
            List.of("PLACED", "CONFIRMED", "PREPARING", "READY");

    // Driver-originated statuses — everything else comes from the restaurant
    private static final java.util.Set<String> DRIVER_STATUSES =
            java.util.Set.of("DRIVER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED");

    @Override
    public Order updateStatus(String orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        // Keep the two display fields in sync so the tracking page can read them directly
        if (DRIVER_STATUSES.contains(newStatus)) {
            order.setDriverStatus(newStatus);
            // PICKED_UP is a driver sub-status; the customer-facing main status
            // moves to OUT_FOR_DELIVERY (food has left the restaurant).
            // All other driver statuses are written straight to main status.
            order.setStatus("PICKED_UP".equals(newStatus) ? "OUT_FOR_DELIVERY" : newStatus);
        } else {
            order.setRestaurantStatus(newStatus);
            order.setStatus(newStatus);
        }
        order.setUpdatedAt(LocalDateTime.now());
        Order saved = orderRepository.save(order);

        // Publish event → Notification-Service will push SSE to the customer
        OrderStatusUpdatedEvent event = OrderStatusUpdatedEvent.builder()
                .orderId(saved.getId())
                .userId(saved.getUserId())
                .customerName(saved.getCustomerName())
                .restaurantName(saved.getRestaurantName())
                .newStatus(newStatus)
                .updatedAt(saved.getUpdatedAt())
                .build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.ORDER_STATUS_UPDATED_RKEY,
                event);
        log.info("Published order.status.updated orderId={} status={}", saved.getId(), newStatus);

        // Saga compensating transaction — if a paid order is cancelled, publish order.cancelled
        // so the refund handler can initiate a Razorpay refund.
        if ("CANCELLED".equals(newStatus) && saved.getPaymentId() != null) {
            OrderCancelledEvent cancelledEvent = OrderCancelledEvent.builder()
                    .orderId(saved.getId())
                    .userId(saved.getUserId())
                    .customerEmail(saved.getUserId())   // X-User-Id is the email
                    .customerName(saved.getCustomerName())
                    .restaurantName(saved.getRestaurantName())
                    .paymentId(saved.getPaymentId())
                    .totalAmount(saved.getTotalAmount())
                    .cancelledAt(saved.getUpdatedAt())
                    .build();
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE,
                    RabbitMQConfig.ORDER_CANCELLED_RKEY,
                    cancelledEvent);
            log.info("Published order.cancelled (refund saga) orderId={} paymentId={}",
                    saved.getId(), saved.getPaymentId());
        }

        return saved;
    }

    @Override
    public List<Order> getAvailableOrders() {
        return orderRepository.findByDriverEmailIsNullAndStatusInOrderByCreatedAtDesc(AVAILABLE_STATUSES);
    }

    // Statuses that mean the delivery is finished — exclude these when finding the active order
    private static final List<String> TERMINAL_STATUSES = List.of("DELIVERED", "CANCELLED");

    @Override
    public Order getDriverActiveOrder(String driverEmail) {
        return orderRepository
                .findFirstByDriverEmailAndStatusNotInOrderByCreatedAtDesc(driverEmail, TERMINAL_STATUSES)
                .orElse(null);
    }

    @Override
    public Order acceptOrder(String orderId, String driverEmail) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        // Prevent two drivers from claiming the same order
        if (order.getDriverEmail() != null) {
            throw new OrderConflictException("Order already accepted by another driver");
        }

        // Prevent driver from accepting an order the restaurant hasn't confirmed yet
        if ("PLACED".equals(order.getStatus())) {
            throw new OrderConflictException("Restaurant has not confirmed this order yet");
        }

        order.setDriverEmail(driverEmail);
        order.setDriverStatus("DRIVER_ASSIGNED");
        // Freeze the driver's earnings at acceptance time — not recomputed later
        order.setDriverEarnings(Math.round(order.getTotalAmount() * DRIVER_COMMISSION * 100.0) / 100.0);
        order.setUpdatedAt(LocalDateTime.now());
        Order saved = orderRepository.save(order);
        log.info("Driver {} accepted orderId={}", driverEmail, orderId);

        // Notify customer — "DRIVER_ASSIGNED" is a notification-only signal,
        // it does NOT change the order status (order stays at READY).
        OrderStatusUpdatedEvent event = OrderStatusUpdatedEvent.builder()
                .orderId(saved.getId())
                .userId(saved.getUserId())
                .customerName(saved.getCustomerName())
                .restaurantName(saved.getRestaurantName())
                .newStatus("DRIVER_ASSIGNED")
                .updatedAt(saved.getUpdatedAt())
                .build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.ORDER_STATUS_UPDATED_RKEY,
                event);
        log.info("Published DRIVER_ASSIGNED event for orderId={}", orderId);

        return saved;
    }

    @Override
    public Order markRated(String orderId, Integer driverRating) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        order.setRated(true);
        if (driverRating != null) {
            order.setDriverRating(driverRating);
        }
        return orderRepository.save(order);
    }

    private static final List<String> HISTORY_STATUSES = List.of("DELIVERED", "CANCELLED");

    @Override
    public PaginatedResponse<Order> getDriverHistory(String driverEmail, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return PaginatedResponse.of(
                orderRepository.findByDriverEmailAndStatusInOrderByCreatedAtDesc(
                        driverEmail, HISTORY_STATUSES, pageable)
        );
    }

    private static final double DRIVER_COMMISSION = 0.15;  // 15% of order total

    /**
     * Returns the driver's earnings for an order.
     * Uses the frozen driverEarnings field if set (orders accepted after the fix).
     * Falls back to computing from totalAmount for legacy orders that pre-date the field.
     */
    private double storedEarnings(Order o) {
        return o.getDriverEarnings() != null
                ? o.getDriverEarnings()
                : Math.round(o.getTotalAmount() * DRIVER_COMMISSION * 100.0) / 100.0;
    }
    private static final DateTimeFormatter DAY_FMT  = DateTimeFormatter.ofPattern("EEE");   // "Mon"
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("d MMM"); // "26 May"

    @Override
    public DriverEarningsDTO getDriverEarnings(String driverEmail) {
        ZoneId ist = ZoneId.of("Asia/Kolkata");
        LocalDate todayIST = LocalDate.now(ist);

        // ── Today ─────────────────────────────────────────────────────
        LocalDateTime todayStart = todayIST.atStartOfDay();
        LocalDateTime todayEnd   = todayIST.atTime(LocalTime.MAX);
        List<Order> todayOrders  = orderRepository
                .findByDriverEmailAndStatusAndCreatedAtBetween(driverEmail, "DELIVERED", todayStart, todayEnd);

        double todayAmount      = todayOrders.stream().mapToDouble(o -> storedEarnings(o)).sum();
        int    todayDeliveries  = todayOrders.size();

        // ── This week (Mon → Sun) ─────────────────────────────────────
        LocalDate weekStart = todayIST.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd   = weekStart.plusDays(6);
        List<Order> weekOrders = orderRepository
                .findByDriverEmailAndStatusAndCreatedAtBetween(driverEmail, "DELIVERED",
                        weekStart.atStartOfDay(), weekEnd.atTime(LocalTime.MAX));

        double weekAmount     = weekOrders.stream().mapToDouble(o -> storedEarnings(o)).sum();
        int    weekDeliveries = weekOrders.size();

        // ── All time ──────────────────────────────────────────────────
        List<Order> allOrders      = orderRepository.findByDriverEmailAndStatus(driverEmail, "DELIVERED");
        double allTimeAmount       = allOrders.stream().mapToDouble(o -> storedEarnings(o)).sum();
        int    allTimeDeliveries   = allOrders.size();
        double avg = allTimeDeliveries > 0 ? allTimeAmount / allTimeDeliveries : 0;

        // ── Performance stats ─────────────────────────────────────────
        List<Order> cancelledOrders    = orderRepository.findByDriverEmailAndStatus(driverEmail, "CANCELLED");
        int         cancelledDeliveries = cancelledOrders.size();
        int         totalAttempted      = allTimeDeliveries + cancelledDeliveries;
        double      completionRate      = totalAttempted > 0
                ? Math.round((double) allTimeDeliveries / totalAttempted * 10000.0) / 100.0
                : 0;

        List<Order> ratedOrders = allOrders.stream()
                .filter(o -> o.getDriverRating() != null)
                .collect(Collectors.toList());
        int    ratingCount = ratedOrders.size();
        double avgRating   = ratingCount > 0
                ? Math.round(ratedOrders.stream().mapToInt(Order::getDriverRating).average().orElse(0) * 10.0) / 10.0
                : 0;

        // ── Per-day breakdown for current week ────────────────────────
        List<DriverEarningsDTO.DayEarning> breakdown = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate day       = weekStart.plusDays(i);
            LocalDateTime start = day.atStartOfDay();
            LocalDateTime end   = day.atTime(LocalTime.MAX);
            // filter weekOrders instead of hitting DB again
            List<Order> dayOrders = weekOrders.stream()
                    .filter(o -> !o.getCreatedAt().isBefore(start) && !o.getCreatedAt().isAfter(end))
                    .collect(Collectors.toList());
            double dayAmount = dayOrders.stream().mapToDouble(o -> storedEarnings(o)).sum();
            breakdown.add(new DriverEarningsDTO.DayEarning(
                    day.format(DAY_FMT),
                    day.format(DATE_FMT),
                    Math.round(dayAmount * 100.0) / 100.0,
                    dayOrders.size(),
                    day.isEqual(todayIST)
            ));
        }

        return new DriverEarningsDTO(
                Math.round(todayAmount * 100.0) / 100.0,
                todayDeliveries,
                Math.round(weekAmount * 100.0) / 100.0,
                weekDeliveries,
                Math.round(allTimeAmount * 100.0) / 100.0,
                allTimeDeliveries,
                Math.round(avg * 100.0) / 100.0,
                breakdown,
                cancelledDeliveries,
                completionRate,
                avgRating,
                ratingCount
        );
    }

    @Override
    public RestaurantStatsDTO getRestaurantStats(String restaurantId) {
        // Use IST so "today" matches what the partner sees on the clock
        LocalDate todayIST = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        LocalDateTime startOfDay = todayIST.atStartOfDay();
        LocalDateTime endOfDay   = todayIST.atTime(LocalTime.MAX);

        List<Order> todayOrders = orderRepository
                .findByRestaurantIdAndCreatedAtBetween(restaurantId, startOfDay, endOfDay);

        long   todayCount   = todayOrders.size();
        // Use restaurantEarnings (subtotal) — not totalAmount which includes delivery fee + GST
        // Fall back to subtotal field for legacy orders placed before restaurantEarnings was added
        double todayRevenue = todayOrders.stream()
                .mapToDouble(o -> o.getRestaurantEarnings() != null ? o.getRestaurantEarnings() : o.getSubtotal())
                .sum();

        long pendingOrders = orderRepository.countByRestaurantIdAndStatusIn(
                restaurantId, List.of("PLACED", "CONFIRMED"));

        // Load all orders once — derive both count and total revenue in one DB call
        List<Order> allOrders  = orderRepository.findByRestaurantId(restaurantId);
        long   totalOrders     = allOrders.size();
        double totalRevenue    = allOrders.stream()
                .mapToDouble(o -> o.getRestaurantEarnings() != null
                        ? o.getRestaurantEarnings()
                        : o.getSubtotal())
                .sum();

        return new RestaurantStatsDTO(todayCount, todayRevenue, pendingOrders, totalOrders, totalRevenue);
    }

    @Override
    public PaginatedResponse<Order> getAdminOrders(int page, int size, String status) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Order> result = (status != null && !status.isBlank())
                ? orderRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                : orderRepository.findAllByOrderByCreatedAtDesc(pageable);
        return new PaginatedResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getTotalPages(),
                result.getTotalElements(),
                result.getSize());
    }

    @Override
    public AdminStatsDTO getAdminStats() {
        LocalDate todayIST     = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        LocalDateTime startDay = todayIST.atStartOfDay();
        LocalDateTime endDay   = todayIST.atTime(LocalTime.MAX);

        List<Order> todayOrders = orderRepository.findByCreatedAtBetween(startDay, endDay);
        long   ordersToday  = todayOrders.size();
        double revenueToday = todayOrders.stream().mapToDouble(Order::getTotalAmount).sum();

        long   totalOrders  = orderRepository.count();
        double totalRevenue = orderRepository.findAll().stream()
                .mapToDouble(Order::getTotalAmount).sum();

        return new AdminStatsDTO(ordersToday, revenueToday, totalOrders, totalRevenue);
    }
}
