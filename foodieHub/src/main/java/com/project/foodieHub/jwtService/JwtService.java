package com.project.foodieHub.jwtService;

import static java.rmi.server.LogStream.log;

import com.project.foodieHub.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.SecretKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class JwtService {

  @Value("${jwt.secret.key}")
  private String secretKey;

  @Value("${jwt.token.expiration}")
  private int jwtExpiration;

  private SecretKey key;

  @PostConstruct
  public void init() {
    if (secretKey.length() < 32) {
      log.error("JWT secret key must be at least 32 characters long!");
    }
    this.key = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
  }

  public String generateToken(UserDetails userDetails) {
    Map<String, Object> claims = new HashMap<>();
    return createToken(claims, userDetails);
  }

  public boolean validateToken(String token) {
    try {
      Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
      return !isTokenExpired(token);
    } catch (IllegalArgumentException | UnsupportedJwtException | MalformedJwtException |
             ExpiredJwtException e) {
      return false;
    }
  }

  private String createToken(Map<String, Object> claims, UserDetails userDetails) {
    claims.put("name", ((User) userDetails).getName());
    claims.put("role", userDetails.getAuthorities());

    return Jwts.builder().addClaims(claims).setSubject(userDetails.getUsername())
        .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
        .setIssuedAt(new Date(System.currentTimeMillis()))
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
  }

  private boolean isTokenExpired(String token) {
    return extractAllClaims(token).getExpiration().before(new Date());
  }

  private Claims extractAllClaims(String token) {
    return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
  }

  public String extractUserName(String token) {
    return extractAllClaims(token).getSubject();
  }
}
