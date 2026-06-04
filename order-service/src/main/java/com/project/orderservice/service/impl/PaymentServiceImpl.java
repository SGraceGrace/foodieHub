package com.project.orderservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.orderservice.config.RazorpayProperties;
import com.project.orderservice.document.Cart;
import com.project.orderservice.document.Order;
import com.project.orderservice.document.RestaurantCart;
import com.project.orderservice.dto.InitiatePaymentRequest;
import com.project.orderservice.dto.InitiatePaymentResponse;
import com.project.orderservice.dto.PlaceOrderRequest;
import com.project.orderservice.dto.VerifyPaymentRequest;
import com.project.orderservice.repo.CartRepository;
import com.project.orderservice.service.OrderService;
import com.project.orderservice.service.PaymentService;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private static final double DELIVERY_FEE        = 30.0;
    private static final double FREE_DELIVERY_ABOVE = 500.0;
    private static final double GST_RATE            = 0.05;

    private static final String IDEM_PREFIX = "idempotency:razorpay:";

    private final RazorpayClient      razorpayClient;
    private final RazorpayProperties  props;
    private final CartRepository      cartRepository;
    private final OrderService        orderService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper        objectMapper;

    // ── Initiate ─────────────────────────────────────────────────────

    @Override
    public InitiatePaymentResponse initiatePayment(String userId, InitiatePaymentRequest req) {

        // 1. Find the cart bucket for this restaurant
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty"));

        RestaurantCart rc = cart.getRestaurants().stream()
                .filter(r -> r.getRestaurantId().equals(req.getRestaurantId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "No items for restaurant: " + req.getRestaurantId()));

        if (rc.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty for this restaurant");
        }

        // 2. Calculate order total (mirrors OrderServiceImpl logic)
        double subtotal    = rc.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQty()).sum();
        double deliveryFee = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
        double gst         = Math.round(subtotal * GST_RATE);
        double total       = subtotal + deliveryFee + gst;
        int    amountPaise = (int) Math.round(total * 100); // Razorpay needs paise

        // 3. Create a Razorpay order
        try {
            JSONObject options = new JSONObject();
            options.put("amount",   amountPaise);
            options.put("currency", "INR");
            options.put("receipt",  "fh_" + System.currentTimeMillis());

            com.razorpay.Order rzpOrder = razorpayClient.orders.create(options);
            log.info("Razorpay order created: id={} amount={}", (String) rzpOrder.get("id"), amountPaise);

            return InitiatePaymentResponse.builder()
                    .razorpayOrderId(rzpOrder.get("id"))
                    .amount(amountPaise)
                    .currency("INR")
                    .keyId(props.getKeyId())
                    .build();

        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Payment initiation failed: " + e.getMessage());
        }
    }

    // ── Verify ───────────────────────────────────────────────────────

    @Override
    public Order verifyAndPlace(String userId, VerifyPaymentRequest req) {

        // 0. Idempotency check — razorpayOrderId is unique per checkout session
        //    If this verify request is a retry (network drop after payment succeeded),
        //    return the original order without creating a duplicate.
        String idemKey = IDEM_PREFIX + req.getRazorpayOrderId();
        String cached  = redisTemplate.opsForValue().get(idemKey);
        if (cached != null) {
            try {
                Order existing = objectMapper.readValue(cached, Order.class);
                log.info("Idempotent replay for razorpayOrderId={} → returning orderId={}", req.getRazorpayOrderId(), existing.getId());
                return existing;
            } catch (Exception e) {
                log.warn("Cached order deserialization failed for key={}, re-processing", idemKey);
            }
        }

        // 1. Verify Razorpay HMAC-SHA256 signature
        if (!verifySignature(req.getRazorpayOrderId(), req.getRazorpayPaymentId(), req.getRazorpaySignature())) {
            log.warn("Payment signature mismatch for paymentId={}", req.getRazorpayPaymentId());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment signature verification failed");
        }

        // 2. Build the order request — attaching the Razorpay payment ID
        PlaceOrderRequest placeReq = new PlaceOrderRequest();
        placeReq.setRestaurantId(req.getRestaurantId());
        placeReq.setDeliveryAddress(req.getDeliveryAddress());
        placeReq.setCustomerName(req.getCustomerName());
        placeReq.setPaymentId(req.getRazorpayPaymentId());

        // 3. Delegate to OrderService — saves order, clears cart, publishes RabbitMQ event
        Order order = orderService.placeOrder(userId, placeReq);
        log.info("Payment verified → order placed. orderId={} paymentId={}", order.getId(), req.getRazorpayPaymentId());

        // 4. Store result so retries return the same order (TTL 24h)
        try {
            redisTemplate.opsForValue().set(idemKey, objectMapper.writeValueAsString(order), Duration.ofHours(24));
        } catch (Exception e) {
            log.warn("Failed to cache idempotency result for key={}", idemKey);
        }

        return order;
    }

    // ── HMAC helpers ─────────────────────────────────────────────────

    /**
     * Razorpay signature = HMAC-SHA256( razorpayOrderId + "|" + paymentId, keySecret )
     */
    private boolean verifySignature(String razorpayOrderId, String paymentId, String signature) {
        try {
            String payload = razorpayOrderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                    props.getKeySecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));

            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                String h = Integer.toHexString(0xff & b);
                if (h.length() == 1) hex.append('0');
                hex.append(h);
            }
            return hex.toString().equals(signature);

        } catch (Exception e) {
            log.error("HMAC verification error", e);
            return false;
        }
    }
}
