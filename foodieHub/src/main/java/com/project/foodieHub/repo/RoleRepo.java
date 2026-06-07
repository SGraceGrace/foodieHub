package com.project.foodieHub.repo;

import com.project.foodieHub.entity.Roles;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RoleRepo extends JpaRepository<Roles, Long> {

  Optional<Roles> findByRoleName(String name);
}
