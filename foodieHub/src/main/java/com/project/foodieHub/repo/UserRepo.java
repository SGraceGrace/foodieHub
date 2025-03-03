package com.project.foodieHub.repo;

import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepo extends JpaRepository<User, Long> {

  Optional<User> findByUserNameAndStatus(String username, UserStatus status);

  Optional<User> findByEmailAndStatus(String email, UserStatus status);
}
