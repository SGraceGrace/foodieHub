package com.project.foodieHub.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Embeddable
@Data
public class Address {

    @Column(name = "addressLine1", nullable = false)
    @NotNull(message = "addressLine1 cannot be empty")
    private String addressLine1;

    @Column(name = "addressLine2", nullable = true)
    private String addressLine2;

    @Column(name = "house_no", nullable = true)
    private String houseNo;

    @Column(name = "landmark", nullable = true)
    private String landmark;

    @Column(name = "area", nullable = true)
    private String area;
}
