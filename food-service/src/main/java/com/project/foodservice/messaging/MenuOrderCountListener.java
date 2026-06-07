package com.project.foodservice.messaging;

import com.project.foodservice.service.MenuItemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Consumes order.placed events from food-service's own queue and increments
 * orderCount / totalQuantity / totalRevenue on each MenuItemDocument.
 *
 * This runs independently from the notification-service consumer —
 * they each have their own queue and receive their own copy of the event.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MenuOrderCountListener {

    private final MenuItemService menuItemService;

    @RabbitListener(queues = RabbitMQConfig.ORDER_PLACED_FOOD_QUEUE)
    public void onOrderPlaced(OrderPlacedEvent event) {
        if (event.getItems() == null || event.getItems().isEmpty()) {
            log.debug("order.placed event for orderId={} has no items — skipping count update", event.getOrderId());
            return;
        }

        int updated = 0;
        for (OrderItemEvent item : event.getItems()) {
            if (item.getMenuItemId() != null) {
                menuItemService.incrementOrderCount(item.getMenuItemId(), item.getQty(), item.getPrice());
                updated++;
            }
        }

        log.info("Updated order counts for {}/{} items on orderId={}",
                updated, event.getItems().size(), event.getOrderId());
    }
}
