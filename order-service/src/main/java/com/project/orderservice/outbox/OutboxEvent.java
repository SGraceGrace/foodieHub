package com.project.orderservice.outbox;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "outbox_events")
public class OutboxEvent {

    @Id
    private String id;

    private String aggregateId;   // orderId — for tracing which order this event belongs to
    private String eventType;     // human label e.g. "order.placed"
    private String exchange;      // RabbitMQ exchange name
    private String routingKey;    // RabbitMQ routing key
    private String payloadClass;  // fully-qualified class name — poller uses this to deserialize
    private String payloadJson;   // Jackson-serialized event payload

    @Indexed                      // queried on every poll cycle — keep it fast
    private boolean sent;

    private LocalDateTime sentAt;

    @CreatedDate
    private LocalDateTime createdAt;
}
