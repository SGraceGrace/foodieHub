package com.project.orderservice.outbox;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface OutboxEventRepository extends MongoRepository<OutboxEvent, String> {
    List<OutboxEvent> findBySentFalseOrderByCreatedAtAsc();
}
