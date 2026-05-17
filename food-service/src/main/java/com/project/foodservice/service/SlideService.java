package com.project.foodservice.service;

import com.project.foodservice.document.Slide;
import com.project.foodservice.dto.SlideRequestDTO;

import java.util.List;

public interface SlideService {
    List<Slide> getActiveSlides();
    List<Slide> getAllSlides();
    Slide create(SlideRequestDTO dto);
    Slide update(String id, SlideRequestDTO dto);
    void delete(String id);
    Slide toggleActive(String id);
}
