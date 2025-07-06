package com.project.foodieHub.config;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;

public class CustomAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

  private final OAuth2AuthorizationRequestResolver defaultResolver;

  public CustomAuthorizationRequestResolver(ClientRegistrationRepository repo, String authorizationRequestBaseUri) {
    this.defaultResolver =
        new DefaultOAuth2AuthorizationRequestResolver(repo, authorizationRequestBaseUri);
  }

  @Override
  public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
    OAuth2AuthorizationRequest req = defaultResolver.resolve(request);
    return customizeRequest(request, req);
  }

  @Override
  public OAuth2AuthorizationRequest resolve(HttpServletRequest request,
      String clientRegistrationId) {
    OAuth2AuthorizationRequest req = defaultResolver.resolve(request, clientRegistrationId);
    return customizeRequest(request, req);
  }

  private OAuth2AuthorizationRequest customizeRequest(HttpServletRequest request, OAuth2AuthorizationRequest req) {
    if (req == null) {
      return null;
    }

    String deviceId = request.getParameter("deviceId");
    Map<String, Object> additionalParams = new HashMap<>(req.getAdditionalParameters());

    if (deviceId != null) {
      additionalParams.put(OAuth2ParameterNames.STATE, deviceId); // You can also encode JSON if more data
    }

    return OAuth2AuthorizationRequest.from(req)
        .state(deviceId) // put deviceId into the state
        .additionalParameters(additionalParams)
        .build();
  }
}
