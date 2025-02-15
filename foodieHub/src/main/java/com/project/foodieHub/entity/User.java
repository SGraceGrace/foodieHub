package com.project.foodieHub.entity;

import com.project.foodieHub.enums.UserStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "user")
@Data
public class User extends BaseEntity implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    @NotNull(message = "Name cannot be empty")
    private String name;

    @Column(name = "user_name", nullable = false)
    @NotNull(message = "Username cannot be null")
    private String userName;

    @Column(name = "password", nullable = false)
    @NotNull(message = "Password cannot be null")
    private String password;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false) // Foreign Key
    private Roles role;

    @Column(name = "status", nullable = false)
    @Enumerated(value = EnumType.STRING)
    private UserStatus status;

    @OneToOne
    @JoinColumn(name = "id")
    private UserProfile userProfile;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + getRole().getRoleName()));
    }

    @Override
    public String getUsername() {
        return userName;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
