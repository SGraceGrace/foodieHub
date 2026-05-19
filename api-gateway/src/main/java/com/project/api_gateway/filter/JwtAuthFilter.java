package com.project.api_gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.*;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/v1/auth/login",
            "/api/v1/auth/signup",
            "/api/v1/auth/logout",
            "/api/v1/refresh-token",
            "/api/v1/contact",
            "/api/v1/slides",
            "/api/v1/restaurants",
            "/api/v1/partner/register",
            "/api/v1/driver/register",
            "/login/oauth2",
            "/oauth2",
            "/actuator"
    );

    @Value("${jwt.secret.key}")
    private String secretKey;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        if (isPublicPath(path) || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.getWriter().write("Missing or invalid Authorization header");
            return;
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = extractClaims(token);
            String userId = claims.getSubject();
            List<?> authorities = claims.get("role", List.class);
            String role = (authorities != null && !authorities.isEmpty())
                    ? authorities.get(0).toString()
                    : "";

            MutableHttpServletRequest mutableRequest = new MutableHttpServletRequest(request);
            mutableRequest.addHeader("X-User-Id", userId);
            mutableRequest.addHeader("X-User-Role", role != null ? role : "");

            filterChain.doFilter(mutableRequest, response);
        } catch (Exception e) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.getWriter().write("Invalid or expired token");
        }
    }

    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    private Claims extractClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
    }

    static class MutableHttpServletRequest extends HttpServletRequestWrapper {

        private final Map<String, String> customHeaders = new HashMap<>();

        MutableHttpServletRequest(HttpServletRequest request) {
            super(request);
        }

        void addHeader(String name, String value) {
            customHeaders.put(name, value);
        }

        @Override
        public String getHeader(String name) {
            if (customHeaders.containsKey(name)) return customHeaders.get(name);
            return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if (customHeaders.containsKey(name))
                return Collections.enumeration(List.of(customHeaders.get(name)));
            return super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            Set<String> names = new HashSet<>(customHeaders.keySet());
            Enumeration<String> original = super.getHeaderNames();
            while (original.hasMoreElements()) names.add(original.nextElement());
            return Collections.enumeration(names);
        }
    }
}
