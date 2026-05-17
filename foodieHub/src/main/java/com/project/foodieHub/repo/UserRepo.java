package com.project.foodieHub.repo;

import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.UserStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepo extends JpaRepository<User, Long> {

  Optional<User> findByUserNameAndStatus(String username, UserStatus status);

  Optional<User> findByUserName(String username);

  @Query("SELECT u FROM User u WHERE u.role.roleName != 'ADMIN' " +
         "AND (:status IS NULL OR u.status = :status) " +
         "AND (:search IS NULL OR (LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
         "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
         "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))))")
  List<User> findNonAdminUsers(@Param("status") UserStatus status, @Param("search") String search);
}
