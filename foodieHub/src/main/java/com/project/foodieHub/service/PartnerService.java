package com.project.foodieHub.service;

import com.project.foodieHub.dto.CreateRestaurantStaffRequestDTO;
import com.project.foodieHub.dto.PartnerRegisterRequestDTO;
import com.project.foodieHub.dto.RestaurantStaffResponseDTO;

import java.util.List;

public interface PartnerService {
    void register(PartnerRegisterRequestDTO dto);
    RestaurantStaffResponseDTO createStaff(CreateRestaurantStaffRequestDTO dto);
    List<RestaurantStaffResponseDTO> getStaff(String restaurantId);
    void archiveStaff(Long staffId);
    void activateStaff(Long staffId);
}
