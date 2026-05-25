package com.project.notificationservice.listener;

import com.project.notificationservice.config.RabbitMQConfig;
import com.project.notificationservice.dto.NotificationDTO;
import com.project.notificationservice.dto.RestaurantNotificationDTO;
import com.project.notificationservice.entity.Notification;
import com.project.notificationservice.entity.RestaurantNotification;
import com.project.notificationservice.dto.CustomerOrderUpdateDTO;
import com.project.notificationservice.event.ActivityLoggedEvent;
import com.project.notificationservice.event.ContactMessageEvent;
import com.project.notificationservice.event.DriverRegisteredEvent;
import com.project.notificationservice.event.OrderPlacedEvent;
import com.project.notificationservice.event.OrderStatusUpdatedEvent;
import com.project.notificationservice.event.OwnerStatusEvent;
import com.project.notificationservice.event.PartnerRegisteredEvent;
import com.project.notificationservice.dto.DriverOrderNotificationDTO;
import com.project.notificationservice.entity.CustomerNotification;
import com.project.notificationservice.entity.DriverNotification;
import com.project.notificationservice.repo.CustomerNotificationRepo;
import com.project.notificationservice.repo.DriverNotificationRepo;
import com.project.notificationservice.repo.NotificationRepo;
import com.project.notificationservice.repo.RestaurantNotificationRepo;
import com.project.notificationservice.service.SseEmitterService;
import com.project.notificationservice.service.WebPushService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationListener {

    private final JavaMailSender mailSender;
    private final NotificationRepo notificationRepo;
    private final RestaurantNotificationRepo restaurantNotificationRepo;
    private final CustomerNotificationRepo customerNotificationRepo;
    private final DriverNotificationRepo driverNotificationRepo;
    private final SseEmitterService sseEmitterService;
    private final WebPushService webPushService;
    private final RestTemplate restTemplate;

    @Value("${admin.email}")
    private String adminEmail;

    @Value("${user-service.base-url:http://localhost:8081}")
    private String userServiceBaseUrl;

    // ── Partner registration → save notification + email admin ───

    private void saveAndPush(Notification n) {
        Notification saved = notificationRepo.save(n);
        NotificationDTO dto = new NotificationDTO(
                saved.getId(), saved.getType(), saved.getMessage(),
                saved.getActorEmail(), saved.getCreatedAt());
        if ("SUPER_ADMIN_ONLY".equals(saved.getVisibleTo())) {
            sseEmitterService.pushToSuperAdmins(dto);
            webPushService.sendToSuperAdmins(saved.getType(), saved.getMessage());
        } else {
            sseEmitterService.pushToAllAdmins(dto);
            webPushService.sendToAllAdmins(saved.getType(), saved.getMessage());
        }
    }

    @RabbitListener(queues = RabbitMQConfig.PARTNER_QUEUE)
    public void onPartnerRegistered(PartnerRegisteredEvent event) {
        Notification n = new Notification();
        n.setType("PENDING_OWNER");
        n.setMessage("New restaurant registration: " + event.getRestaurantName()
                + " by " + event.getOwnerName());
        n.setVisibleTo("ALL_ADMINS");
        saveAndPush(n);
        log.info("Saved PENDING_OWNER notification for partner: {}", event.getEmail());

        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(adminEmail);
            msg.setSubject("New Restaurant Partner Registration — Action Required");
            msg.setText(buildPartnerEmail(event));
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send approval email for {}: {}", event.getEmail(), e.getMessage());
        }
    }

    // ── Driver registration → save notification ───────────────────

    @RabbitListener(queues = RabbitMQConfig.DRIVER_QUEUE)
    public void onDriverRegistered(DriverRegisteredEvent event) {
        Notification n = new Notification();
        n.setType("PENDING_DRIVER");
        n.setMessage("New driver registration by " + event.getDriverName()
                + " (" + event.getVehicleType() + ")");
        n.setVisibleTo("ALL_ADMINS");
        saveAndPush(n);
        log.info("Saved PENDING_DRIVER notification for driver: {}", event.getEmail());
    }

    // ── Contact message submitted → save notification ────────────

    @RabbitListener(queues = RabbitMQConfig.CONTACT_QUEUE)
    public void onContactMessage(ContactMessageEvent event) {
        Notification n = new Notification();
        n.setType("CONTACT_MESSAGE");
        n.setMessage("New message from " + event.getName() + ": " + event.getSubject());
        n.setActorEmail(event.getEmail());
        n.setVisibleTo("ALL_ADMINS");
        saveAndPush(n);
        log.info("Saved CONTACT_MESSAGE notification from: {}", event.getEmail());
    }

    // ── Activity logged → save notification ───────────────────────

    @RabbitListener(queues = RabbitMQConfig.ACTIVITY_QUEUE)
    public void onActivityLogged(ActivityLoggedEvent event) {
        // ACTIVITY notifications are for SUPER_ADMIN oversight only.
        // The admin who performed the action already knows what they did.
        Notification n = new Notification();
        n.setType("ACTIVITY");
        n.setMessage(event.getMessage());
        n.setActorEmail(event.getActorEmail()); // stored for display, not for filtering
        n.setVisibleTo("SUPER_ADMIN_ONLY");
        saveAndPush(n);
        log.info("Saved ACTIVITY notification: {}", event.getMessage());
    }

    // ── Owner approved/rejected → notify owner ───────────────────

    @RabbitListener(queues = RabbitMQConfig.OWNER_STATUS_QUEUE)
    public void onOwnerStatus(OwnerStatusEvent event) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(event.getOwnerEmail());
            msg.setSubject("APPROVED".equals(event.getStatus())
                    ? "Your Restaurant Has Been Approved! 🎉"
                    : "FoodieHub Registration Update");
            msg.setText(buildOwnerStatusEmail(event));
            mailSender.send(msg);
            log.info("Owner status email sent to {} — status: {}", event.getOwnerEmail(), event.getStatus());
        } catch (Exception e) {
            log.error("Failed to send owner status email to {}: {}", event.getOwnerEmail(), e.getMessage());
        }
    }

    // ── Order placed → notify restaurant (SSE) + customer (email) ───

    @RabbitListener(queues = RabbitMQConfig.ORDER_PLACED_QUEUE)
    public void onOrderPlaced(OrderPlacedEvent event) {

        // 1. Save restaurant notification to MongoDB
        RestaurantNotification rn = new RestaurantNotification();
        rn.setRestaurantId(event.getRestaurantId());
        rn.setType("NEW_ORDER");
        rn.setOrderId(event.getOrderId());
        rn.setCustomerName(event.getCustomerName());
        rn.setDeliveryAddress(event.getDeliveryAddress());
        rn.setItemNames(event.getItemNames());
        rn.setTotalAmount(event.getTotalAmount());
        rn.setRead(false);
        RestaurantNotification saved = restaurantNotificationRepo.save(rn);
        log.info("Saved restaurant notification for restaurantId={}", event.getRestaurantId());

        // 2. Push live to restaurant via SSE
        RestaurantNotificationDTO dto = new RestaurantNotificationDTO(
                saved.getId(), saved.getRestaurantId(), saved.getType(),
                saved.getOrderId(), saved.getCustomerName(), saved.getDeliveryAddress(),
                saved.getItemNames(), saved.getTotalAmount(), saved.isRead(), saved.getCreatedAt());
        sseEmitterService.pushToRestaurant(event.getRestaurantId(), dto);

        // 3. Send order confirmation email to customer
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(event.getCustomerEmail());
            msg.setSubject("Order Confirmed! 🎉");
            msg.setText(buildOrderEmail(event));
            mailSender.send(msg);
            log.info("Order confirmation email sent to: {}", event.getCustomerEmail());
        } catch (Exception e) {
            log.error("Failed to send order email for order {}: {}", event.getOrderId(), e.getMessage());
        }
    }

    // ── Order status changed → persist + notify customer ─────────

    @RabbitListener(queues = RabbitMQConfig.ORDER_STATUS_UPDATED_QUEUE)
    public void onOrderStatusUpdated(OrderStatusUpdatedEvent event) {
        String status = event.getNewStatus();
        String msg    = statusMessage(status, event.getRestaurantName());

        // 0. Persist new notification document for this status change
        CustomerNotification cn = new CustomerNotification();
        cn.setUserId(event.getUserId());
        cn.setOrderId(event.getOrderId());
        cn.setRestaurantName(event.getRestaurantName());
        cn.setNewStatus(status);
        cn.setMessage(msg);
        cn.setRead(false);
        CustomerNotification saved = customerNotificationRepo.save(cn);
        log.info("Saved customer notification for userId={} orderId={} status={}",
                event.getUserId(), event.getOrderId(), status);

        // 1. SSE — patches the order tracker in real-time if the tab is open
        CustomerOrderUpdateDTO dto = new CustomerOrderUpdateDTO(
                saved.getId(),
                event.getOrderId(),
                event.getRestaurantName(),
                status,
                msg,
                saved.getCreatedAt(),
                false);
        sseEmitterService.pushToCustomer(event.getUserId(), dto);

        // 2. Web Push — OS-level notification via VAPID, works even when tab is closed
        webPushService.sendToCustomer(
                event.getUserId(),
                event.getRestaurantName(),
                msg,
                event.getOrderId(),
                status);

        log.info("Notified customer {} — orderId={} status={}", event.getUserId(), event.getOrderId(), status);
    }

    private String statusMessage(String status, String restaurantName) {
        return switch (status) {
            case "CONFIRMED"        -> "✅ " + restaurantName + " accepted your order!";
            case "PREPARING"        -> "👨‍🍳 " + restaurantName + " is preparing your food!";
            case "READY"            -> "📦 Your order is packed and ready for pickup!";
            case "DRIVER_ASSIGNED"  -> "🚗 A driver has been assigned to your order!";
            case "OUT_FOR_DELIVERY" -> "🛵 Driver picked up your food and is on the way!";
            case "DELIVERED"        -> "🎉 Delivered! Tap to rate " + restaurantName + " ⭐";
            case "CANCELLED"        -> "❌ Your order was cancelled by the restaurant.";
            default                 -> "Order status updated: " + status;
        };
    }

    // ── Order placed → notify nearby online drivers (SSE + Web Push) ─

    @RabbitListener(queues = RabbitMQConfig.DRIVER_ORDER_PLACED_QUEUE)
    public void onOrderPlacedForDriver(OrderPlacedEvent event) {
        // 1. Fetch all online drivers (those with known GPS location) from user-service.
        //    Calls the internal endpoint directly on port 8081 — bypasses the gateway.
        List<String> driverEmails;
        try {
            var response = restTemplate.exchange(
                    userServiceBaseUrl + "/api/v1/internal/drivers/online",
                    HttpMethod.GET, null,
                    new ParameterizedTypeReference<List<String>>() {});
            driverEmails = response.getBody() != null ? response.getBody() : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Could not fetch online drivers — skipping driver notification for order {}: {}",
                    event.getOrderId(), e.getMessage());
            return;
        }

        if (driverEmails.isEmpty()) {
            log.info("No online drivers to notify for order {}", event.getOrderId());
            return;
        }

        int itemCount  = event.getItemNames() != null ? event.getItemNames().size() : 0;
        // POC: earn ≈ 15% of order total. Real platforms compute this from distance + base fee.
        double earnAmount = Math.round(event.getTotalAmount() * 0.15 * 100.0) / 100.0;

        String bodyText = itemCount + " item" + (itemCount != 1 ? "s" : "")
                + " · ₹" + String.format("%.0f", earnAmount) + " earn";

        for (String driverEmail : driverEmails) {
            // 2a. Persist notification to driver_notifications
            DriverNotification dn = new DriverNotification();
            dn.setDriverEmail(driverEmail);
            dn.setOrderId(event.getOrderId());
            dn.setRestaurantName(event.getRestaurantName());
            dn.setDeliveryAddress(event.getDeliveryAddress());
            dn.setItemCount(itemCount);
            dn.setEarnAmount(earnAmount);
            dn.setItemNames(event.getItemNames());
            DriverNotification saved = driverNotificationRepo.save(dn);

            // 2b. SSE — patches the notification bell in real-time if the tab is open
            DriverOrderNotificationDTO dto = new DriverOrderNotificationDTO(
                    saved.getId(),
                    saved.getOrderId(),
                    saved.getRestaurantName(),
                    saved.getDeliveryAddress(),
                    saved.getItemCount(),
                    saved.getEarnAmount(),
                    saved.getItemNames(),
                    false,
                    saved.getCreatedAt());
            sseEmitterService.pushToDriver(driverEmail, dto);

            // 2c. Web Push — OS-level notification, works when tab is closed
            webPushService.sendToDriver(driverEmail, event.getRestaurantName(), bodyText, event.getOrderId());
        }

        log.info("Notified {} online driver(s) about order {}", driverEmails.size(), event.getOrderId());
    }

    // ── Email bodies ──────────────────────────────────────────────

    private String buildOwnerStatusEmail(OwnerStatusEvent e) {
        if ("APPROVED".equals(e.getStatus())) {
            return """
                    Hi %s,

                    Great news! Your restaurant "%s" has been approved on FoodieHub. 🎉

                    You can now log in to your partner portal and start setting up your menu.

                    Login: http://localhost:4200/partner/login

                    Welcome aboard!

                    — FoodieHub Team
                    """.formatted(e.getOwnerName(), e.getRestaurantName());
        } else {
            return """
                    Hi %s,

                    Thank you for registering "%s" on FoodieHub.

                    After reviewing your application, we are unable to approve your registration at this time.
                    Please ensure your FSSAI license and business details are valid and contact support if you
                    believe this is a mistake.

                    — FoodieHub Team
                    """.formatted(e.getOwnerName(), e.getRestaurantName());
        }
    }

    private String buildPartnerEmail(PartnerRegisteredEvent e) {
        return """
                A new restaurant partner has registered on FoodieHub and is awaiting your approval.

                Owner Details
                -------------
                Name     : %s
                Email    : %s
                Phone    : %s

                Restaurant Details
                ------------------
                Name     : %s
                Address  : %s
                FSSAI No : %s
                GST No   : %s

                Please log in to the admin panel to review and approve or reject this application.

                — FoodieHub System
                """.formatted(
                e.getOwnerName(),
                e.getEmail(),
                e.getPhone()            != null ? e.getPhone()            : "—",
                e.getRestaurantName(),
                e.getRestaurantAddress() != null ? e.getRestaurantAddress() : "—",
                e.getFssaiNumber()       != null ? e.getFssaiNumber()       : "—",
                e.getGstNumber()         != null ? e.getGstNumber()         : "—"
        );
    }

    private String buildOrderEmail(OrderPlacedEvent e) {
        String items = e.getItemNames() != null
                ? String.join(", ", e.getItemNames())
                : "—";
        return """
                Hi %s,

                Your order has been placed successfully! 🎉

                Order Details
                -------------
                Order ID   : %s
                Restaurant : %s
                Items      : %s
                Total      : ₹%.2f

                We'll notify you when your order is on its way.

                Thanks for ordering on FoodieHub!

                — FoodieHub Team
                """.formatted(
                e.getCustomerName(),
                e.getOrderId(),
                e.getRestaurantName(),
                items,
                e.getTotalAmount()
        );
    }
}
