package com.project.notificationservice.service;

import com.project.notificationservice.dto.PushSubscriptionRequest;
import com.project.notificationservice.entity.AdminPushSubscription;
import com.project.notificationservice.entity.CustomerPushSubscription;
import com.project.notificationservice.entity.DriverPushSubscription;
import com.project.notificationservice.repo.AdminPushSubscriptionRepo;
import com.project.notificationservice.repo.CustomerPushSubscriptionRepo;
import com.project.notificationservice.repo.DriverPushSubscriptionRepo;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Security;
import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebPushService {

    @Value("${vapid.public-key}")
    private String vapidPublicKey;

    @Value("${vapid.private-key}")
    private String vapidPrivateKey;

    private final AdminPushSubscriptionRepo subscriptionRepo;
    private final CustomerPushSubscriptionRepo customerSubscriptionRepo;
    private final DriverPushSubscriptionRepo driverSubscriptionRepo;
    private PushService pushService;

    @PostConstruct
    void init() throws Exception {
        Security.addProvider(new BouncyCastleProvider());
        pushService = new PushService(vapidPublicKey, vapidPrivateKey, "mailto:admin@foodiehub.com");
    }

    public void saveSubscription(String adminEmail, String adminRole, PushSubscriptionRequest req) {
        subscriptionRepo.findByAdminEmailAndEndpoint(adminEmail, req.endpoint()).ifPresentOrElse(
            existing -> {
                existing.setP256dh(req.keys().get("p256dh"));
                existing.setAuth(req.keys().get("auth"));
                existing.setAdminRole(adminRole);
                subscriptionRepo.save(existing);
            },
            () -> {
                AdminPushSubscription sub = new AdminPushSubscription();
                sub.setAdminEmail(adminEmail);
                sub.setAdminRole(adminRole);
                sub.setEndpoint(req.endpoint());
                sub.setP256dh(req.keys().get("p256dh"));
                sub.setAuth(req.keys().get("auth"));
                sub.setCreatedAt(Instant.now());
                subscriptionRepo.save(sub);
                log.info("Saved push subscription for {}", adminEmail);
            }
        );
    }

    public void sendToAllAdmins(String type, String message) {
        send(type, message, subscriptionRepo.findAll());
    }

    public void sendToSuperAdmins(String type, String message) {
        send(type, message, subscriptionRepo.findByAdminRoleContaining("SUPER_ADMIN"));
    }

    private void send(String type, String message, List<AdminPushSubscription> subs) {
        if (subs.isEmpty()) return;
        String title = switch (type) {
            case "PENDING_OWNER"  -> "New Restaurant Registration";
            case "PENDING_DRIVER" -> "New Driver Registration";
            default               -> "FoodieHub Admin";
        };
        String safeMsg = message.replace("\\", "\\\\").replace("\"", "\\\"");
        String payload = "{\"title\":\"" + title + "\",\"body\":\"" + safeMsg
                + "\",\"url\":\"/admin\",\"tag\":\"foodiehub\"}";

        for (AdminPushSubscription sub : subs) {
            try {
                Notification notification = new Notification(sub.getEndpoint(), sub.getP256dh(), sub.getAuth(), payload);
                HttpResponse response = pushService.send(notification);
                int status = response.getStatusLine().getStatusCode();
                if (status == 410 || status == 404) {
                    subscriptionRepo.delete(sub);
                    log.info("Removed expired push subscription for {}", sub.getAdminEmail());
                }
            } catch (Exception e) {
                log.warn("Web push failed for {}: {}", sub.getAdminEmail(), e.getMessage());
            }
        }
    }

    // ── Customer push subscriptions ───────────────────────────────────

    public void saveCustomerSubscription(String userId, PushSubscriptionRequest req) {
        customerSubscriptionRepo.findByUserIdAndEndpoint(userId, req.endpoint()).ifPresentOrElse(
            existing -> {
                existing.setP256dh(req.keys().get("p256dh"));
                existing.setAuth(req.keys().get("auth"));
                customerSubscriptionRepo.save(existing);
            },
            () -> {
                CustomerPushSubscription sub = new CustomerPushSubscription();
                sub.setUserId(userId);
                sub.setEndpoint(req.endpoint());
                sub.setP256dh(req.keys().get("p256dh"));
                sub.setAuth(req.keys().get("auth"));
                sub.setCreatedAt(Instant.now());
                customerSubscriptionRepo.save(sub);
                log.info("Saved customer push subscription for userId={}", userId);
            }
        );
    }

    /**
     * Sends a VAPID Web Push to all registered browser sessions for a customer.
     * Called by NotificationListener when restaurant changes order status.
     *
     * @param newStatus included in the tag so every status transition is a distinct
     *                  notification — without this, the browser silently replaces the
     *                  previous notification (same tag = silent update, no popup/sound).
     */
    public void sendToCustomer(String userId, String title, String body,
                               String orderId, String newStatus) {
        List<CustomerPushSubscription> subs = customerSubscriptionRepo.findByUserId(userId);
        if (subs.isEmpty()) return;

        String safeTitle = title.replace("\\", "\\\\").replace("\"", "\\\"");
        String safeBody  = body.replace("\\", "\\\\").replace("\"", "\\\"");
        // Tag format: order-{orderId}-{status}
        // Each status transition gets a unique tag → separate popup + sound for each one.
        String tag     = "order-" + orderId + "-" + newStatus.toLowerCase();
        String payload = "{\"title\":\"" + safeTitle + "\",\"body\":\"" + safeBody
                + "\",\"url\":\"/user/orders\",\"tag\":\"" + tag + "\"}";

        for (CustomerPushSubscription sub : subs) {
            try {
                Notification notification = new Notification(sub.getEndpoint(), sub.getP256dh(), sub.getAuth(), payload);
                HttpResponse response = pushService.send(notification);
                int status = response.getStatusLine().getStatusCode();
                if (status == 410 || status == 404) {
                    customerSubscriptionRepo.delete(sub);
                    log.info("Removed expired customer push subscription for userId={}", userId);
                }
            } catch (Exception e) {
                log.warn("Customer web push failed for userId={}: {}", userId, e.getMessage());
            }
        }
    }

    // ── Driver push subscriptions ─────────────────────────────────────

    public void saveDriverSubscription(String driverEmail, PushSubscriptionRequest req) {
        driverSubscriptionRepo.findByDriverEmailAndEndpoint(driverEmail, req.endpoint()).ifPresentOrElse(
            existing -> {
                existing.setP256dh(req.keys().get("p256dh"));
                existing.setAuth(req.keys().get("auth"));
                driverSubscriptionRepo.save(existing);
            },
            () -> {
                DriverPushSubscription sub = new DriverPushSubscription();
                sub.setDriverEmail(driverEmail);
                sub.setEndpoint(req.endpoint());
                sub.setP256dh(req.keys().get("p256dh"));
                sub.setAuth(req.keys().get("auth"));
                sub.setCreatedAt(Instant.now());
                driverSubscriptionRepo.save(sub);
                log.info("Saved driver push subscription for driverEmail={}", driverEmail);
            }
        );
    }

    /**
     * Sends a VAPID Web Push to all registered browser sessions for a driver.
     * Called by NotificationListener when a new order is available nearby.
     *
     * @param orderId  included in the tag so every new order is a distinct notification —
     *                 same-tag notifications would silently replace each other.
     */
    public void sendToDriver(String driverEmail, String restaurantName,
                             String body, String orderId) {
        List<DriverPushSubscription> subs = driverSubscriptionRepo.findByDriverEmail(driverEmail);
        if (subs.isEmpty()) return;

        String safeRestaurant = restaurantName.replace("\\", "\\\\").replace("\"", "\\\"");
        String safeBody       = body.replace("\\", "\\\\").replace("\"", "\\\"");
        String tag            = "driver-order-" + orderId;
        String payload = "{\"title\":\"" + safeRestaurant + "\",\"body\":\"" + safeBody
                + "\",\"url\":\"/driver\",\"tag\":\"" + tag + "\"}";

        for (DriverPushSubscription sub : subs) {
            try {
                Notification notification = new Notification(sub.getEndpoint(), sub.getP256dh(), sub.getAuth(), payload);
                HttpResponse response = pushService.send(notification);
                int status = response.getStatusLine().getStatusCode();
                if (status == 410 || status == 404) {
                    driverSubscriptionRepo.delete(sub);
                    log.info("Removed expired driver push subscription for driverEmail={}", driverEmail);
                }
            } catch (Exception e) {
                log.warn("Driver web push failed for driverEmail={}: {}", driverEmail, e.getMessage());
            }
        }
    }
}
