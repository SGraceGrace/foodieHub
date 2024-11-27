package com.project.foodieHub.entity;

import com.project.foodieHub.enums.UserStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

import java.util.Set;

@Entity
@Table(name = "users")
public class Users extends BaseEntity{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    @NotNull(message = "Name cannot be empty")
    private String name;

    @Column(name = "password", nullable = false)
    @NotNull(message = "Password cannot be null")
    private String password;

    @Column(name = "user_name", nullable = false)
    @NotNull(message = "Username cannot be null")
    private String userName;

    @Column(name = "status", nullable = false)
    @Enumerated(value = EnumType.STRING)
    private UserStatus status;

    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Roles> roles;

    @Column(name = "email", nullable = false)
    @NotNull(message = "Email cannot be null")
    private String email;

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
}
