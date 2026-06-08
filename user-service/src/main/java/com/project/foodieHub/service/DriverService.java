package com.project.foodieHub.service;

import com.project.foodieHub.dto.DriverProfileDTO;
import com.project.foodieHub.dto.DriverProfileUpdateDTO;
import com.project.foodieHub.dto.DriverRegisterRequestDTO;

import java.util.List;

public interface DriverService {
    void register(DriverRegisterRequestDTO dto);
    void setAvailability(String email, boolean online);
    DriverProfileDTO getProfile(String email);
    DriverProfileDTO updateProfile(String email, DriverProfileUpdateDTO dto);
    void updateLocation(String email, double lat, double lng);

    /** Returns emails of all drivers currently online with known location. */
    List<String> getOnlineDriverEmails();
}
