package com.project.foodieHub.config;

import com.project.foodieHub.entity.User;
import com.project.foodieHub.enums.AuthProvider;
import com.project.foodieHub.enums.Role;
import com.project.foodieHub.enums.UserStatus;
import com.project.foodieHub.exception_handler.CommonException;
import com.project.foodieHub.jwtService.JwtService;
import com.project.foodieHub.repo.RoleRepo;
import com.project.foodieHub.repo.UserRepo;
import com.project.foodieHub.service.RefreshTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

public class CustomOAuth2SuccessHandler implements AuthenticationSuccessHandler {

  @Autowired
  private JwtService jwtService;

  @Autowired
  private UserRepo userRepo;

  @Autowired
  private RoleRepo roleRepo;

  @Autowired
  private RefreshTokenService refreshTokenService;

  @Autowired
  private RedisTemplate<String, String> redisTemplate;

  @Value("${jwt.token.expiration}")
  private int jwtExpiration;

  @Override
  public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
      Authentication authentication) throws IOException {
    DefaultOAuth2User oAuth2User = (DefaultOAuth2User) authentication.getPrincipal();

    OAuth2AuthenticationToken authToken = (OAuth2AuthenticationToken) authentication;
    String registrationId = authToken.getAuthorizedClientRegistrationId();

    Map<String, Object> attributes = oAuth2User.getAttributes();
    String email = (String) attributes.get("email");
    String userName = (String) attributes.get("email");
    String firstName = (String) attributes.get("given_name");
    String lastName = (String) attributes.get("family_name");
    String deviceId = request.getParameter("state") != null ? request.getParameter("state") : "";
    String googleId = oAuth2User.getAttribute("sub");

    Optional<User> existingUser = userRepo.findByUserNameAndStatus(email, UserStatus.ACTIVE);
    User user;

    if(existingUser.isEmpty()) {
      var roles = roleRepo.findByRoleName(
          Role.END_USERS.name()).orElseThrow(() -> new CommonException("Something went wrong"));
      User newUser = new User();
      newUser.setUserName(userName);
      newUser.setFirstName(firstName);
      newUser.setLastName(lastName);
      newUser.setRole(roles);
      newUser.setStatus(UserStatus.ACTIVE);
      newUser.setEmail(email);
      newUser.setAuthProvider(AuthProvider.GOOGLE);
      newUser.setProviderId(googleId);
      user = userRepo.saveAndFlush(newUser);
    } else {
      user = existingUser.get();
    }
    var token = jwtService.generateToken(user, deviceId);
    var refreshToken = refreshTokenService.createRefreshToken(user, deviceId);
    redisTemplate.opsForValue().set(user.getUsername()+deviceId, token, Duration.ofMillis(jwtExpiration)); //store token in redis

    String frontendUrl = System.getenv().getOrDefault("FRONTEND_URL", "http://localhost:4200");
    String redirectUrl = String.format(
        "%s/google-callback?accessToken=%s&refreshToken=%s",
        frontendUrl,
        URLEncoder.encode(token, StandardCharsets.UTF_8),
        URLEncoder.encode(refreshToken.getToken(), StandardCharsets.UTF_8)
    );
    response.sendRedirect(redirectUrl);
  }
}
