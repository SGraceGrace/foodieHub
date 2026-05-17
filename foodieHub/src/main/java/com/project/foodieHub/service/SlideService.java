package com.project.foodieHub.service;

import com.project.foodieHub.dto.SlideRequestDTO;
import com.project.foodieHub.entity.Slide;

import java.util.List;

public interface SlideService {
    List<Slide> getActiveSlides();
    List<Slide> getAllSlides();
    Slide create(SlideRequestDTO dto);
    Slide update(Long id, SlideRequestDTO dto);
    void delete(Long id);
    Slide toggleActive(Long id);
}
