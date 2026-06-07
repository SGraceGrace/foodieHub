package com.project.foodservice.messaging;

import com.project.foodservice.document.OwnerApproval;
import com.project.foodservice.enums.RestaurantStatus;
import com.project.foodservice.repo.OwnerApprovalRepo;
import com.project.foodservice.service.RestaurantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OwnerStatusListener {

    private final RestaurantService restaurantService;
    private final OwnerApprovalRepo ownerApprovalRepo;

    @RabbitListener(queues = RabbitMQConfig.OWNER_STATUS_QUEUE)
    public void handleOwnerStatus(OwnerStatusEvent event) {
        log.info("Received owner status event: ownerId={}, status={}", event.getOwnerId(), event.getStatus());

        RestaurantStatus newStatus = switch (event.getStatus()) {
            case "APPROVED" -> RestaurantStatus.ACTIVE;
            case "REJECTED" -> RestaurantStatus.INACTIVE;
            default -> {
                log.warn("Unknown owner status '{}', skipping restaurant update", event.getStatus());
                yield null;
            }
        };

        if (newStatus != null) {
            ownerApprovalRepo.save(new OwnerApproval(event.getOwnerId(), newStatus == RestaurantStatus.ACTIVE));
            restaurantService.updateStatusByOwnerId(event.getOwnerId(), newStatus);
            log.info("Updated restaurants for ownerId={} to status={}", event.getOwnerId(), newStatus);
        }
    }
}
