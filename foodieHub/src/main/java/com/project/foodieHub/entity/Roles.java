package com.project.foodieHub.entity;

import com.project.foodieHub.enums.Role;
import jakarta.persistence.*;
import lombok.Data;

import java.util.Set;

@Entity
@Table(name = "roles")
@Data
public class Roles extends BaseEntity{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "role_name")
    @Enumerated(EnumType.STRING)
    private Role roleName;

    @ManyToMany
    @JoinTable(
            name = "role_permissions",
            joinColumns = @JoinColumn(name = "role_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permissions> permissions;

    @ManyToMany(mappedBy = "roles")
    private Set<User> users;
}
