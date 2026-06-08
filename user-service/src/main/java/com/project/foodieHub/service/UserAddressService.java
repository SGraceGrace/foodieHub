package com.project.foodieHub.service;

import com.project.foodieHub.dto.UserAddressRequestDTO;
import com.project.foodieHub.entity.UserAddress;

import java.util.List;

public interface UserAddressService {

    List<UserAddress> getAddresses(String username);

    UserAddress addAddress(String username, UserAddressRequestDTO dto);

    void deleteAddress(String username, Long addressId);

    UserAddress setDefault(String username, Long addressId);
}
