package com.project.orderservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class HeaderAuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String userId     = request.getHeader("X-User-Id");
        String roleHeader = request.getHeader("X-User-Role");

        if (userId != null && !userId.isBlank()) {
            String role = extractRole(roleHeader);
            var authorities = role.isBlank()
                    ? List.<SimpleGrantedAuthority>of()
                    : List.of(new SimpleGrantedAuthority(role));

            var auth = new UsernamePasswordAuthenticationToken(userId, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        chain.doFilter(request, response);
    }

    // Gateway injects role as "{authority=ROLE_CUSTOMER}" — extract the value part.
    private String extractRole(String header) {
        if (header == null || header.isBlank()) return "";
        if (header.contains("=")) {
            int eq  = header.indexOf('=');
            int end = header.indexOf('}');
            if (end > eq) return header.substring(eq + 1, end).trim();
        }
        return header.trim();
    }
}
