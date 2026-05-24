package com.project.foodieHub.repo;

import com.project.foodieHub.entity.DriverProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DriverProfileRepo extends JpaRepository<DriverProfile, Long> {

    /** Returns emails of all drivers who are currently online and have a known location. */
    @Query("SELECT dp.user.email FROM DriverProfile dp WHERE dp.online = true AND dp.latitude IS NOT NULL AND dp.longitude IS NOT NULL")
    List<String> findEmailsOfOnlineDriversWithLocation();
}
