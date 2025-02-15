package com.project.foodieHub.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Set;

@Entity
@Table(name = "permissions")
@Data
public class Permissions extends BaseEntity{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "permission_name")
    private String permissionName;

    @ManyToMany(mappedBy = "permissions")
    private Set<Roles> roles;
}
