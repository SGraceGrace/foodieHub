package com.project.foodieHub.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "partner_profile")
@Data
@NoArgsConstructor
public class PartnerProfile {

    @Id
    private Long userId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "restaurant_name", length = 255)
    private String restaurantName;

    @Column(name = "fssai_number", length = 20)
    private String fssaiNumber;

    @Column(name = "gst_number", length = 20)
    private String gstNumber;

    @Embedded
    private Location restaurantLocation;

    public PartnerProfile(User user, String restaurantName, String fssaiNumber,
                          String gstNumber, Location restaurantLocation) {
        this.user = user;
        this.restaurantName = restaurantName;
        this.fssaiNumber = fssaiNumber;
        this.gstNumber = gstNumber;
        this.restaurantLocation = restaurantLocation;
    }
}
