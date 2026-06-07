package com.project.foodservice.repo;

import com.project.foodservice.document.OwnerApproval;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface OwnerApprovalRepo extends MongoRepository<OwnerApproval, String> {
}
