package com.project.foodieHub.service.impl;

import com.project.foodieHub.dto.UserAddressRequestDTO;
import com.project.foodieHub.entity.User;
import com.project.foodieHub.entity.UserAddress;
import com.project.foodieHub.enums.UserStatus;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.repo.UserAddressRepo;
import com.project.foodieHub.repo.UserRepo;
import com.project.foodieHub.service.UserAddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserAddressServiceImpl implements UserAddressService {

    private final UserRepo userRepo;
    private final UserAddressRepo userAddressRepo;

    private User findUser(String username) {
        return userRepo.findByUserNameAndStatus(username, UserStatus.ACTIVE)
                .orElseThrow(() -> new CommonException("User not found"));
    }

    @Override
    public List<UserAddress> getAddresses(String username) {
        return userAddressRepo.findByUser(findUser(username));
    }

    @Override
    @Transactional
    public UserAddress addAddress(String username, UserAddressRequestDTO dto) {
        User user = findUser(username);

        if (dto.isDefaultAddress()) {
            userAddressRepo.findByUserAndDefaultAddressTrue(user)
                    .ifPresent(existing -> { existing.setDefaultAddress(false); userAddressRepo.save(existing); });
        }

        UserAddress address = new UserAddress();
        address.setUser(user);
        address.setLabel(dto.getLabel());
        address.setAddressText(dto.getAddressText());
        address.setLandmark(dto.getLandmark());
        address.setDefaultAddress(dto.isDefaultAddress());
        return userAddressRepo.save(address);
    }

    @Override
    public void deleteAddress(String username, Long addressId) {
        User user = findUser(username);
        UserAddress address = userAddressRepo.findByIdAndUser(addressId, user)
                .orElseThrow(() -> new CommonException("Address not found"));
        userAddressRepo.delete(address);
    }

    @Override
    @Transactional
    public UserAddress setDefault(String username, Long addressId) {
        User user = findUser(username);
        userAddressRepo.findByUserAndDefaultAddressTrue(user)
                .ifPresent(existing -> { existing.setDefaultAddress(false); userAddressRepo.save(existing); });
        UserAddress address = userAddressRepo.findByIdAndUser(addressId, user)
                .orElseThrow(() -> new CommonException("Address not found"));
        address.setDefaultAddress(true);
        return userAddressRepo.save(address);
    }
}
