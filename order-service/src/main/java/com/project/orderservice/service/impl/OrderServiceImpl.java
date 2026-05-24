package com.project.orderservice.service.impl;

import com.project.orderservice.document.Cart;
import com.project.orderservice.document.CartItem;
import com.project.orderservice.document.Order;
import com.project.orderservice.document.OrderItem;
import com.project.orderservice.document.RestaurantCart;
import com.project.orderservice.dto.PaginatedResponse;
import com.project.orderservice.dto.PlaceOrderRequest;
import com.project.orderservice.messaging.OrderPlacedEvent;
import com.project.orderservice.messaging.OrderStatusUpdatedEvent;
import com.project.orderservice.messaging.RabbitMQConfig;
import com.project.orderservice.repo.CartRepository;
import com.project.orderservice.repo.OrderRepository;
import com.project.orderservice.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private static final double DELIVERY_FEE        = 30.0;
    private static final double FREE_DELIVERY_ABOVE = 500.0;
    private static final double GST_RATE            = 0.05;

    private final CartRepository   cartRepository;
    private final OrderRepository  orderRepository;
    private final RabbitTemplate   rabbitTemplate;

    @Override
    public Order placeOrder(String userId, PlaceOrderRequest req) {

        // 1. Fetch cart
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty"));

        // 2. Find the restaurant bucket
        RestaurantCart rc = cart.getRestaurants().stream()
                .filter(r -> r.getRestaurantId().equals(req.getRestaurantId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "No items found for restaurant: " + req.getRestaurantId()));

        if (rc.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty for this restaurant");
        }

        // 3. Map cart items → order items & compute bill
        List<OrderItem> orderItems = rc.getItems().stream().map(ci -> {
            OrderItem oi = new OrderItem();
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

        // 6. Publish order.placed event → RabbitMQ → notification-service
        List<String> itemNames = orderItems.stream()
                .map(i -> i.getName() + " x" + i.getQty())
                .collect(Collectors.toList());

        OrderPlacedEvent event = OrderPlacedEvent.builder()
                .orderId(saved.getId())
                .userId(userId)
                .customerEmail(userId)          // X-User-Id is the email
                .customerName(saved.getCustomerName())
                .restaurantId(saved.getRestaurantId())
                .restaurantName(saved.getRestaurantName())
                .totalAmount(total)
                .itemNames(itemNames)
                .deliveryAddress(req.getDeliveryAddress())
                .placedAt(saved.getCreatedAt())
                .build();

        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.ORDER_PLACED_RKEY, event);
        log.info("Published order.placed for orderId={} restaurantId={}", saved.getId(), saved.getRestaurantId());

        return saved;
    }

    @Override
    public List<Order> getOrderHistory(String userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public Order getOrder(String userId, String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (!order.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
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

    @Override
    public Order updateStatus(String orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        order.setStatus(newStatus);
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

        return saved;
    }
}
