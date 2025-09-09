package com.project.foodieHub.repo;

import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.UserStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepo extends JpaRepository<User, Long> {

  Optional<User> findByUserNameAndStatus(String username, UserStatus status);
}
