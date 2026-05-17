package com.project.foodieHub.messaging;

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

    @RabbitListener(queues = RabbitMQConfig.PARTNER_QUEUE)
    public void onPartnerRegistered(PartnerRegisteredEvent event) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(adminEmail);
            msg.setSubject("New Restaurant Partner Registration — Action Required");
            msg.setText(buildEmailBody(event));
            mailSender.send(msg);
            log.info("Approval email sent to admin for partner: {}", event.getEmail());
        } catch (Exception e) {
            log.error("Failed to send approval email for partner {}: {}", event.getEmail(), e.getMessage());
        }
    }

    private String buildEmailBody(PartnerRegisteredEvent e) {
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
                e.getPhone() != null ? e.getPhone() : "—",
                e.getRestaurantName(),
                e.getRestaurantAddress() != null ? e.getRestaurantAddress() : "—",
                e.getFssaiNumber() != null ? e.getFssaiNumber() : "—",
                e.getGstNumber() != null ? e.getGstNumber() : "—"
        );
    }
}
