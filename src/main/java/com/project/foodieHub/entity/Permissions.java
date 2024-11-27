package com.project.foodieHub.entity;

import jakarta.persistence.*;

import java.util.Set;

public class Permissions extends BaseEntity{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private String id;

    @Column(name = "role_name")
    private String roleName;

    @ManyToMany(mappedBy = "permissions")
    private Set<Roles> roles;
}
