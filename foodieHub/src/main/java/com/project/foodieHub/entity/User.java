package com.project.foodieHub.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.project.foodieHub.enums.AuthProvider;
import com.project.foodieHub.enums.UserStatus;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "user", uniqueConstraints = {
    @UniqueConstraint(columnNames = "username")
})
@Data
public class User extends BaseEntity implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name", nullable = false)
    @NotNull(message = "First Name cannot be empty")
    private String firstName;

    @Column(name = "last_name", nullable = false)
    @NotNull(message = "Last Name cannot be null")
    private String lastName;

    @Column(name = "username", nullable = false, unique = true)
    @NotNull(message = "Username cannot be null")
    private String userName;

    @Column(name = "email", nullable = false)
    @NotNull(message = "Email cannot be null")
    private String email;

    @Column(name = "password")
//    @NotNull(message = "Password cannot be null")
    @JsonIgnore
    private String password = "DEFAULT_PASSWORD";

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false) // Foreign Key
    private Roles role;

    @Column(name = "status", nullable = false, columnDefinition = "VARCHAR(50)")
    @Enumerated(value = EnumType.STRING)
    private UserStatus status;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<RefreshToken> refreshTokens;

    @Column(name = "phone")
    private String phone;

    @Column(name = "date_of_birth")
    private String dateOfBirth;

    @Column(name = "gender")
    private String gender;

    @Column(name = "bio", length = 500)
    private String bio;

    @Column(name = "restaurant_address", length = 500)
    private String restaurantAddress;

    @Column(name = "fssai_number", length = 20)
    private String fssaiNumber;

    @Column(name = "gst_number", length = 20)
    private String gstNumber;

    @Column(name = "auth_provider")
    @Enumerated(EnumType.STRING)
    private AuthProvider authProvider = AuthProvider.LOCAL;

    @Column(name = "provider_id")
    private String providerId;

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
