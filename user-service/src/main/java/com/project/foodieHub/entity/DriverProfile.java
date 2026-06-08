package com.project.foodieHub.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "driver_profile")
@Data
@NoArgsConstructor
public class DriverProfile {

    @Id
    private Long userId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "vehicle_type", length = 50)
    private String vehicleType;

    @Column(name = "license_number", length = 50)
    private String licenseNumber;

    @Column(name = "bank_account", length = 50)
    private String bankAccount;

    @Column(name = "is_online", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private boolean online = false;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "last_location_at")
    private LocalDateTime lastLocationAt;

    public DriverProfile(User user, String vehicleType, String licenseNumber, String bankAccount) {
        this.user = user;
        this.vehicleType = vehicleType;
        this.licenseNumber = licenseNumber;
        this.bankAccount = bankAccount;
    }
}
