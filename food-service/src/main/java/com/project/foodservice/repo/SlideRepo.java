package com.project.foodservice.repo;

import com.project.foodservice.document.Slide;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SlideRepo extends MongoRepository<Slide, String> {
    List<Slide> findByActiveTrueOrderByDisplayOrderAsc();
}
