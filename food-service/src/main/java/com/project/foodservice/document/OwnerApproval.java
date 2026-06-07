package com.project.foodservice.document;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "owner_approvals")
public class OwnerApproval {

    @Id
    private String ownerId;

    private boolean approved;
}
