package com.project.foodieHub.repo;

import com.project.foodieHub.entity.RefreshToken;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepo extends JpaRepository<RefreshToken, Long> {

  Optional<RefreshToken> findByToken(String refreshToken);
}
