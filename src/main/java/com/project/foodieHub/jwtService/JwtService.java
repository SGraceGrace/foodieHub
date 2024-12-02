package com.project.foodieHub.jwtService;

import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.Role;
import io.jsonwebtoken.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {

    @Value("${jwt.secret.key}")
    private String secretKey;

    @Value("${jwt.token.expiration}")
    private int jwtExpiration;

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, userDetails);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(secretKey).build().parse(token);
            if(!isTokenExpired(token)) {
                return false;
            }
            return true;
        } catch (IllegalArgumentException | UnsupportedJwtException | MalformedJwtException | ExpiredJwtException e){
            return false;
        }
    }

    private String createToken(Map<String, Object> claims, UserDetails userDetails) {
        claims.put("name", ((User) userDetails).getName());
        claims.put("role", userDetails.getAuthorities());

        return Jwts.builder().addClaims(claims).setSubject(userDetails.getUsername())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .signWith(SignatureAlgorithm.ES256, secretKey)
                .compact();
    }

    private boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder().setSigningKey(secretKey).build().parseClaimsJws(token).getBody();
    }

    public String extractUserName(String token) {
        return extractAllClaims(token).getSubject();
    }
}
