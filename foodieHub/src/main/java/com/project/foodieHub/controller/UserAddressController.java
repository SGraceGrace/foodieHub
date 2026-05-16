package com.project.foodieHub.controller;

import com.project.foodieHub.dto.BaseAPIResponse;
import com.project.foodieHub.dto.UserAddressRequestDTO;
import com.project.foodieHub.service.UserAddressService;
import com.project.foodieHub.service.impl.CurrentUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/user/addresses")
@RequiredArgsConstructor
public class UserAddressController {

    private final UserAddressService userAddressService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public ResponseEntity<BaseAPIResponse> getAddresses() {
        var username = currentUserService.getCurrentUsername();
        var data = userAddressService.getAddresses(username);
        return ResponseEntity.ok(new BaseAPIResponse("SUCCESS", data, HttpStatus.OK.value(), null));
    }

    @PostMapping
    public ResponseEntity<BaseAPIResponse> addAddress(@Valid @RequestBody UserAddressRequestDTO dto) {
        var username = currentUserService.getCurrentUsername();
        var address = userAddressService.addAddress(username, dto);
        return ResponseEntity.ok(new BaseAPIResponse("Address added successfully", address, HttpStatus.OK.value(), null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseAPIResponse> deleteAddress(@PathVariable Long id) {
        var username = currentUserService.getCurrentUsername();
        userAddressService.deleteAddress(username, id);
        return ResponseEntity.ok(new BaseAPIResponse("Address deleted", null, HttpStatus.OK.value(), null));
    }

    @PutMapping("/{id}/default")
    public ResponseEntity<BaseAPIResponse> setDefault(@PathVariable Long id) {
        var username = currentUserService.getCurrentUsername();
        var address = userAddressService.setDefault(username, id);
        return ResponseEntity.ok(new BaseAPIResponse("Default address updated", address, HttpStatus.OK.value(), null));
    }
}
