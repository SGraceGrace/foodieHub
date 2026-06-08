package com.project.foodieHub.repo;

import com.project.foodieHub.entity.User;
import com.project.foodieHub.entity.UserAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAddressRepo extends JpaRepository<UserAddress, Long> {

    List<UserAddress> findByUser(User user);

    Optional<UserAddress> findByIdAndUser(Long id, User user);

    Optional<UserAddress> findByUserAndDefaultAddressTrue(User user);
}
