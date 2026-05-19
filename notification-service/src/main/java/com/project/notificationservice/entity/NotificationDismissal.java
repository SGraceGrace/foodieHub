package com.project.notificationservice.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "notification_dismissals")
@CompoundIndex(def = "{'adminEmail': 1, 'notificationId': 1}", unique = true)
@Data
public class NotificationDismissal {

    @Id
    private String id;

    private String adminEmail;

    private String notificationId;
}
