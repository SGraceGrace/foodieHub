package com.project.foodieHub.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "user_address")
@Data
public class UserAddress extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "address_text", nullable = false, length = 500)
    private String addressText;

    @Column(name = "landmark")
    private String landmark;

    @Column(name = "is_default")
    private boolean defaultAddress;

    @Column(name = "lat")
    private Double lat;

    @Column(name = "lng")
    private Double lng;
}
