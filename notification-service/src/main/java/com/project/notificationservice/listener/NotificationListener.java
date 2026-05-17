package com.project.notificationservice.listener;

import com.project.notificationservice.config.RabbitMQConfig;
import com.project.notificationservice.event.OrderPlacedEvent;
import com.project.notificationservice.event.OwnerStatusEvent;
import com.project.notificationservice.event.PartnerRegisteredEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationListener {

    private final JavaMailSender mailSender;

    @Value("${admin.email}")
    private String adminEmail;

    // ── Partner registration → notify admin ───────────────────────

    @RabbitListener(queues = RabbitMQConfig.PARTNER_QUEUE)
    public void onPartnerRegistered(PartnerRegisteredEvent event) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(adminEmail);
            msg.setSubject("New Restaurant Partner Registration — Action Required");
            msg.setText(buildPartnerEmail(event));
            mailSender.send(msg);
            log.info("Approval email sent to admin for partner: {}", event.getEmail());
        } catch (Exception e) {
            log.error("Failed to send approval email for {}: {}", event.getEmail(), e.getMessage());
        }
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

    // ── Order placed → notify customer ────────────────────────────

    @RabbitListener(queues = RabbitMQConfig.ORDER_PLACED_QUEUE)
    public void onOrderPlaced(OrderPlacedEvent event) {
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
