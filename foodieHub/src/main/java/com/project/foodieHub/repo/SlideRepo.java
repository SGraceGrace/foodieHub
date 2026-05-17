package com.project.foodieHub.repo;

import com.project.foodieHub.entity.Slide;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SlideRepo extends JpaRepository<Slide, Long> {
    List<Slide> findByActiveTrueOrderByDisplayOrderAsc();
}
