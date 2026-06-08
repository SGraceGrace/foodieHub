package com.project.foodieHub.repo;

import com.project.foodieHub.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityLogRepo extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findAllByOrderByCreatedAtDesc();

    @Query("SELECT l FROM ActivityLog l WHERE l.createdAt >= :start AND l.createdAt < :end ORDER BY l.createdAt DESC")
    List<ActivityLog> findTodayLogs(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT l FROM ActivityLog l WHERE l.actorEmail = :email AND l.createdAt >= :start AND l.createdAt < :end ORDER BY l.createdAt DESC")
    List<ActivityLog> findTodayLogsByActor(@Param("email") String email, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
