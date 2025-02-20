package com.project.foodieHub.entity;

import com.project.foodieHub.enums.UserStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Set;

@Entity
@Table(name = "user_profile")
@Data
public class UserProfile extends BaseEntity{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "phone_no", nullable = false)
    @NotNull(message = "Phoneno cannot be null")
    private String phoneNumber;

    @Embedded
    private Address address;

    @ManyToMany
    @JoinTable(
            name = "user_locations",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "location_id")
    )
    private Set<Locations> locations;

    @Column(name = "is_primary_user")
    private boolean primaryUser;

    @OneToOne
    @JoinColumn(name = "id")
    private User user;
}
