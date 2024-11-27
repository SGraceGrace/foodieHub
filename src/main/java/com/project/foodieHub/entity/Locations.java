package com.project.foodieHub.entity;

import jakarta.persistence.*;

import java.util.Set;

@Entity
@Table(name = "locations")
public class Locations extends BaseEntity{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private String id;

    @Column(name = "city")
    private String city;

    @Column(name = "state")
    private String state;

    @Column(name = "country")
    private String country;

    @ManyToMany(mappedBy = "locations")
    private Set<Users> users;
}
