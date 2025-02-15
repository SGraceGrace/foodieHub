package com.project.foodieHub.config;

import com.project.foodieHub.filter.AuthFilter;
import com.project.foodieHub.service.impl.UserDetailsServiceImpl;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

  private AuthFilter authFilter;
  private UserDetailsServiceImpl userDetailsService;

  public SecurityConfig(AuthFilter authFilter, UserDetailsServiceImpl userDetailsService) {
    this.authFilter = authFilter;
    this.userDetailsService = userDetailsService;
  }

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity) throws Exception {
    return httpSecurity.csrf(csrf -> csrf.disable())
        .cors(cors -> cors.configurationSource(request -> {
          CorsConfiguration corsConfiguration = new CorsConfiguration();
          corsConfiguration.setAllowedOrigins(List.of("*"));
          corsConfiguration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
          corsConfiguration.setAllowedHeaders(List.of("*"));
          corsConfiguration.setAllowCredentials(true); // Allow cookies/auth headers
          return corsConfiguration;
        }))
        .authorizeHttpRequests(request -> request.requestMatchers("/api/user/test").permitAll())
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .addFilterBefore(authFilter, UsernamePasswordAuthenticationFilter.class)
        .authenticationProvider(authenticationProvider()).build();
  }

  @Bean
  public AuthenticationProvider authenticationProvider() {
    DaoAuthenticationProvider daoAuthenticationProvider = new DaoAuthenticationProvider();
    daoAuthenticationProvider.setUserDetailsService(userDetailsService);
    daoAuthenticationProvider.setPasswordEncoder(passwordEncoder());
    return daoAuthenticationProvider;
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}
