package com.project.foodieHub.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.project.foodieHub.enums.AuthProvider;
import com.project.foodieHub.enums.UserStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import java.util.Collection;
import java.util.List;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "user", uniqueConstraints = {
    @UniqueConstraint(columnNames = "email"),
    @UniqueConstraint(columnNames = "username")
})
@Data
public class User extends BaseEntity implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    @NotNull(message = "Name cannot be empty")
    private String name;

    @Column(name = "user_name", nullable = false, unique = true)
    @NotNull(message = "Username cannot be null")
    private String userName;

    @Column(name = "email", nullable = false, unique = true)
    @NotNull(message = "Email cannot be null")
    private String email;

    @Column(name = "password")
//    @NotNull(message = "Password cannot be null")
    @JsonIgnore
    private String password = "DEFAULT_PASSWORD";

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false) // Foreign Key
    private Roles role;

    @Column(name = "status", nullable = false)
    @Enumerated(value = EnumType.STRING)
    private UserStatus status;

    @OneToOne(mappedBy = "user")
    private UserProfile userProfile;

    @OneToOne(mappedBy = "user")
    @JsonManagedReference
    private RefreshToken refreshToken;

    @Column(name = "auth_provider")
    private AuthProvider authProvider = AuthProvider.LOCAL;

    @Column(name = "provider_id")
    private String providerId;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + getRole().getRoleName()));
    }

    @Override
    public String getUsername() {
        return email;
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
