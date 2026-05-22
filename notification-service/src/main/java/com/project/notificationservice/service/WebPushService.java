package com.project.notificationservice.service;

import com.project.notificationservice.dto.PushSubscriptionRequest;
import com.project.notificationservice.entity.AdminPushSubscription;
import com.project.notificationservice.repo.AdminPushSubscriptionRepo;
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
}
