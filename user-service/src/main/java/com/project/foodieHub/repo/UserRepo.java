package com.project.foodieHub.repo;

import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.UserStatus;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepo extends JpaRepository<User, Long> {

  Optional<User> findByUserNameAndStatus(String username, UserStatus status);

  Optional<User> findByUserName(String username);

  @Query("SELECT u FROM User u WHERE " +
         "(:role IS NULL OR u.role.roleName = :role) " +
         "AND (:status IS NULL OR u.status = :status) " +
         "AND (:search IS NULL OR (LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
         "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
         "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))))")
  Page<User> findAllUsers(@Param("role") String role,
                          @Param("status") UserStatus status,
                          @Param("search") String search,
                          Pageable pageable);

  @Query("SELECT u FROM User u WHERE u.role.roleName = 'RESTAURANT_OWNER' " +
         "AND (:status IS NULL OR u.status = :status)")
  Page<User> findRestaurantOwners(@Param("status") UserStatus status, Pageable pageable);

  @Query("SELECT u FROM User u WHERE u.role.roleName = 'RESTAURANT_OWNER' " +
         "AND u.status = 'PENDING' AND u.createdDate >= :start AND u.createdDate < :end " +
         "ORDER BY u.createdDate DESC")
  List<User> findTodayPendingOwners(@Param("start") Date start, @Param("end") Date end);

  @Query("SELECT u FROM User u WHERE u.role.roleName = 'DRIVER' " +
         "AND (:status IS NULL OR u.status = :status) " +
         "AND (:search IS NULL OR (LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
         "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
         "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))))")
  Page<User> findDrivers(@Param("status") UserStatus status,
                         @Param("search") String search,
                         Pageable pageable);

  @Query("SELECT u FROM User u WHERE u.role.roleName = 'DRIVER' " +
         "AND u.status = 'PENDING' AND u.createdDate >= :start AND u.createdDate < :end " +
         "ORDER BY u.createdDate DESC")
  List<User> findTodayPendingDrivers(@Param("start") Date start, @Param("end") Date end);

  @Query("SELECT DISTINCT u FROM User u JOIN u.assignedRestaurantIds rid " +
         "WHERE u.role.roleName = 'RESTAURANT_STAFF' AND rid = :restaurantId ORDER BY u.id DESC")
  List<User> findStaffByRestaurantId(@Param("restaurantId") String restaurantId);
}
