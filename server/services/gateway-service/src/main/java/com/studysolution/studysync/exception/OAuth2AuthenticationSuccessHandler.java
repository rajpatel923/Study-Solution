package com.studysolution.studysync.exception;

import com.studysolution.studysync.models.User;
import com.studysolution.studysync.repository.UserRepository;
import com.studysolution.studysync.services.AuthService;
import com.studysolution.studysync.utils.CookieUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.server.WebFilterExchange;
import org.springframework.security.web.server.authentication.ServerAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationSuccessHandler implements ServerAuthenticationSuccessHandler {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.oauth2.redirect-success-url}")
    private String redirectSuccessUrl;

    @Override
    public Mono<Void> onAuthenticationSuccess(WebFilterExchange webFilterExchange, Authentication authentication) {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        String clientRegistrationId = oauthToken.getAuthorizedClientRegistrationId();
        OAuth2User oAuth2User = oauthToken.getPrincipal();

        log.info("OAuth2 authentication success for provider: {}", clientRegistrationId);

        // Process OAuth user details
        return processOAuthUser(clientRegistrationId, oAuth2User)
                .flatMap(user -> {
                    // Generate tokens
                    String accessToken = authService.generateAccessToken(user);
                    String refreshToken = authService.generateRefreshToken(user);
                    long accessTokenExpiry = authService.getAccessTokenExpiration();
                    long refreshTokenExpiry = authService.getRefreshTokenExpiration();

                    // Add cookies to response
                    ResponseCookie accessTokenCookie = CookieUtil.createAccessTokenCookie(accessToken, accessTokenExpiry);
                    ResponseCookie refreshTokenCookie = CookieUtil.createRefreshTokenCookie(refreshToken, refreshTokenExpiry);

                    webFilterExchange.getExchange().getResponse().addCookie(accessTokenCookie);
                    webFilterExchange.getExchange().getResponse().addCookie(refreshTokenCookie);

                    // Save refresh token to user
                    return authService.saveUserRefreshToken(user, refreshToken)
                            .map(updatedUser -> {
                                // Build redirect URL with token
                                String redirectUri = UriComponentsBuilder
                                        .fromUriString(redirectSuccessUrl)
                                        .queryParam("token", accessToken)
                                        .build().toUriString();

                                log.debug("Redirecting to: {}", redirectUri);

                                // Set redirect URL and status code
                                webFilterExchange.getExchange().getResponse().setStatusCode(HttpStatus.FOUND);
                                webFilterExchange.getExchange().getResponse().getHeaders().setLocation(URI.create(redirectUri));

                                return updatedUser;
                            });
                })
                .then();
    }

    // User processing logic
    private Mono<User> processOAuthUser(String registrationId, OAuth2User oAuth2User) {
        log.debug("Processing OAuth2 user for provider: {}", registrationId);

        // Extract user details based on provider
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String email = extractEmail(registrationId, attributes);
        String username = extractUsername(registrationId, attributes);
        String providerId = extractProviderId(registrationId, attributes);

        if (email == null || email.isEmpty()) {
            log.error("Email not found for OAuth2 user from provider: {}", registrationId);
            return Mono.error(new RuntimeException("Email not available from OAuth provider"));
        }

        // First try to find user by email
        return userRepository.findByEmail(email)
                .flatMap(existingUser -> {
                    // User exists, update OAuth provider info if necessary
                    log.debug("Found existing user by email: {}", email);

                    // Update user attributes here
                    existingUser.setOAuthProvider(registrationId);
                    existingUser.setOAuthProviderId(providerId);

                    return userRepository.save(existingUser);
                })
                .switchIfEmpty(
                        // User not found, try by provider ID
                        userRepository.findByOAuthProviderAndOAuthProviderId(registrationId, providerId)
                                .flatMap(existingUser -> {
                                    log.debug("Found existing user by provider ID: {}", providerId);
                                    return Mono.just(existingUser);
                                })
                                .switchIfEmpty(
                                        // Create new user if not found
                                        createNewOAuthUser(email, username, registrationId, providerId)
                                )
                );
    }

    private Mono<User> createNewOAuthUser(String email, String username, String registrationId, String providerId) {
        log.debug("Creating new user from OAuth2 login: {}, provider: {}", email, registrationId);

        // Generate random password for OAuth users
        String randomPassword = UUID.randomUUID().toString();
        String encodedPassword = passwordEncoder.encode(randomPassword);

        // Create new user
        User newUser = User.builder()
                .email(email)
                .username(username)
                .password(encodedPassword)
                .roles(Collections.singletonList("ROLE_USER"))
                .oAuthProvider(registrationId)
                .oAuthProviderId(providerId)
                .enabled(true)
                .build();

        return userRepository.save(newUser);
    }

    // Helper methods for extracting user details from OAuth2 providers
    private String extractEmail(String registrationId, Map<String, Object> attributes) {
        switch (registrationId) {
            case "github":
                String email = (String) attributes.get("email");
                if (email == null) {
                    // GitHub might not return email if not public
                    log.warn("GitHub email is null. Consider handling private emails.");
                }
                return email;
            case "google":
                return (String) attributes.get("email");
            case "facebook":
                return (String) attributes.get("email");
            case "apple":
                return (String) attributes.get("email");
            default:
                return null;
        }
    }

    private String extractUsername(String registrationId, Map<String, Object> attributes) {
        switch (registrationId) {
            case "github":
                return (String) attributes.get("login");
            case "google":
                // Create username from email
                String email = (String) attributes.get("email");
                return email != null ? email.split("@")[0] : "google_user_" + UUID.randomUUID().toString().substring(0, 8);
            case "facebook":
                return "fb_user_" + attributes.get("id");
            case "apple":
                String sub = (String) attributes.get("sub");
                return sub != null ? "apple_user_" + sub.substring(0, Math.min(8, sub.length())) :
                        "apple_user_" + UUID.randomUUID().toString().substring(0, 8);
            default:
                return "user_" + UUID.randomUUID().toString().substring(0, 8);
        }
    }

    private String extractProviderId(String registrationId, Map<String, Object> attributes) {
        switch (registrationId) {
            case "github":
                Object id = attributes.get("id");
                return id != null ? id.toString() : null;
            case "google":
                return (String) attributes.get("sub");
            case "facebook":
                return (String) attributes.get("id");
            case "apple":
                return (String) attributes.get("sub");
            default:
                return null;
        }
    }
}