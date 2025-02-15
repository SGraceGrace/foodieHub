package com.project.foodieHub.entity;

import com.project.foodieHub.enums.Permission;
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
    @Enumerated(EnumType.STRING)
    private Permission permissionName;

    @ManyToMany(mappedBy = "permissions")
    private Set<Roles> roles;
}
