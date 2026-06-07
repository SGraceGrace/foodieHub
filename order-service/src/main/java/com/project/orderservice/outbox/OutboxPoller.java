package com.project.orderservice.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxPoller {

    private final OutboxEventRepository outboxRepo;
    private final RabbitTemplate        rabbitTemplate;
    private final ObjectMapper          objectMapper;

    /**
     * Runs every 5 seconds. Finds unsent outbox events, publishes them to RabbitMQ,
     * then marks them sent. If RabbitMQ is down, events stay in MongoDB until it recovers.
     *
     * At-least-once delivery: if the service crashes after publish but before marking sent,
     * the event will be published again on the next poll. Consumers must be idempotent.
     */
    @Scheduled(fixedDelay = 5000)
    public void processOutbox() {
        List<OutboxEvent> pending = outboxRepo.findBySentFalseOrderByCreatedAtAsc();
        if (pending.isEmpty()) return;

        log.debug("Outbox poll: {} unsent event(s)", pending.size());

        for (OutboxEvent event : pending) {
            try {
                Class<?> clazz   = Class.forName(event.getPayloadClass());
                Object   payload = objectMapper.readValue(event.getPayloadJson(), clazz);

                rabbitTemplate.convertAndSend(event.getExchange(), event.getRoutingKey(), payload);

                event.setSent(true);
                event.setSentAt(LocalDateTime.now());
                outboxRepo.save(event);

                log.info("Outbox published: type={} aggregateId={}", event.getEventType(), event.getAggregateId());
            } catch (Exception e) {
                log.error("Outbox publish failed for event id={} type={}: {}",
                        event.getId(), event.getEventType(), e.getMessage());
                // Leave sent=false — will retry on the next poll cycle
            }
        }
    }
}
