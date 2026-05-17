package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.SlideRequestDTO;
import com.project.foodieHub.entity.Slide;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.repo.SlideRepo;
import com.project.foodieHub.service.SlideService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SlideServiceImpl implements SlideService {

    private final SlideRepo slideRepo;

    @Override
    public List<Slide> getActiveSlides() {
        return slideRepo.findByActiveTrueOrderByDisplayOrderAsc();
    }

    @Override
    public List<Slide> getAllSlides() {
        return slideRepo.findAll();
    }

    @Override
    public Slide create(SlideRequestDTO dto) {
        return slideRepo.save(map(new Slide(), dto));
    }

    @Override
    public Slide update(Long id, SlideRequestDTO dto) {
        Slide slide = findById(id);
        return slideRepo.save(map(slide, dto));
    }

    @Override
    public void delete(Long id) {
        slideRepo.delete(findById(id));
    }

    @Override
    public Slide toggleActive(Long id) {
        Slide slide = findById(id);
        slide.setActive(!slide.isActive());
        return slideRepo.save(slide);
    }

    private Slide findById(Long id) {
        return slideRepo.findById(id).orElseThrow(() -> new CommonException("Slide not found"));
    }

    private Slide map(Slide slide, SlideRequestDTO dto) {
        slide.setTitle(dto.getTitle());
        slide.setHighlightWord(dto.getHighlightWord());
        slide.setDescription(dto.getDescription());
        slide.setBtn1Text(dto.getBtn1Text());
        slide.setBtn2Text(dto.getBtn2Text());
        slide.setEmoji(dto.getEmoji());
        slide.setBadgeIcon(dto.getBadgeIcon());
        slide.setBadgeText(dto.getBadgeText());
        slide.setDisplayOrder(dto.getDisplayOrder());
        return slide;
    }
}
