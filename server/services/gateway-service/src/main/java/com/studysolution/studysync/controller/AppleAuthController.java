package com.studysolution.studysync.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studysolution.studysync.config.CustomOAuth2User;
import com.studysolution.studysync.models.TokenResponse;
import com.studysolution.studysync.models.User;

import com.studysolution.studysync.repository.UserRepository;
import com.studysolution.studysync.services.AuthService;
import com.studysolution.studysync.services.OAuth2UserService;
import com.studysolution.studysync.utils.AppleAuthHelper;
import com.studysolution.studysync.utils.CookieUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Special controller for Apple Sign In which requires additional handling
 */
@RestController
@RequestMapping("/api/v1/auth/apple")
@RequiredArgsConstructor
@Slf4j
public class AppleAuthController {

    private final AppleAuthHelper appleAuthHelper;
    private final AuthService authService;
    private final UserRepository userRepository;

    @Value("${app.oauth2.redirect-success-url}")
    private String redirectSuccessUrl;

    /**
     * Callback endpoint for Apple Sign In
     */
    @PostMapping("/callback")
    public Mono<ResponseEntity<Void>> handleAppleCallback(
            @RequestParam("code") String authorizationCode,
            @RequestParam("state") String state,
            @RequestParam(value = "user", required = false) String userJson,
            ServerWebExchange exchange) {

        log.debug("Received Apple Sign In callback with code: {}, state: {}",
                authorizationCode.substring(0, Math.min(5, authorizationCode.length())) + "...", state);

        return appleAuthHelper.exchangeAuthorizationCodeForTokens(authorizationCode, state)
                .flatMap(tokens -> {
                    String idToken = (String) tokens.get("id_token");
                    if (idToken == null) {
                        return Mono.error(new RuntimeException("No ID token in Apple response"));
                    }

                    // Parse the ID token to get user information
                    Map<String, Object> userInfo = appleAuthHelper.parseIdToken(idToken);

                    // Extract user data
                    String sub = (String) userInfo.get("sub"); // Apple user ID
                    String email = (String) userInfo.get("email");

                    // If this is the first login, Apple sends the user's name separately
                    if (userJson != null && !userJson.isEmpty()) {
                        try {
                            // Parse user JSON to get name (use ObjectMapper in real code)
                            Map<String, Object> userData = new ObjectMapper().readValue(userJson, Map.class);
                            Map<String, Object> nameData = (Map<String, Object>) userData.get("name");
                            if (nameData != null) {
                                String firstName = (String) nameData.get("firstName");
                                String lastName = (String) nameData.get("lastName");
                                userInfo.put("name", String.format("%s %s", firstName, lastName).trim());
                            }
                        } catch (Exception e) {
                            log.warn("Could not parse Apple user JSON: {}", e.getMessage());
                        }
                    }

                    // Process the user information
                    return processAppleUser(userInfo, email, sub);
                })
                .flatMap(user -> createAuthenticationResponse(user, exchange))
                .onErrorResume(e -> {
                    log.error("Error in Apple Sign In callback: {}", e.getMessage(), e);
                    return Mono.just(ResponseEntity.status(HttpStatus.FOUND)
                            .location(URI.create(redirectSuccessUrl + "?error=Authentication%20failed"))
                            .build());
                });
    }

    private Mono<User> processAppleUser(Map<String, Object> userInfo, String email, String sub) {
        if (email == null || email.isEmpty()) {
            log.error("Email not found for Apple user");
            return Mono.error(new RuntimeException("Email not available from Apple"));
        }

        // Generate username from Apple ID
        String username = "apple_" + sub.substring(0, Math.min(8, sub.length()));

        // First try to find user by email
        return userRepository.findByEmail(email)
                .flatMap(existingUser -> {
                    // User exists, update OAuth provider info
                    log.debug("Found existing user by email: {}", email);
                    existingUser.setOAuthProvider("apple");
                    existingUser.setOAuthProviderId(sub);
                    return userRepository.save(existingUser);
                })
                .switchIfEmpty(
                        // Try to find by provider ID
                        userRepository.findByOAuthProviderAndOAuthProviderId("apple", sub)
                                .flatMap(existingUser -> {
                                    log.debug("Found existing user by provider ID: {}", sub);
                                    return Mono.just(existingUser);
                                })
                                .switchIfEmpty(
                                        // Create new user if not found
                                        createNewAppleUser(email, username, sub, userInfo)
                                )
                );
    }

    private Mono<User> createNewAppleUser(String email, String username, String sub, Map<String, Object> userInfo) {
        log.debug("Creating new user from Apple Sign In: {}", email);

        // Generate random password
        String randomPassword = UUID.randomUUID().toString();
        String encodedPassword = new BCryptPasswordEncoder().encode(randomPassword);

        // Get name if available
        String name = (String) userInfo.getOrDefault("name", "Apple User");

        // Create new user
        User newUser = User.builder()
                .email(email)
                .username(username)
                .password(encodedPassword)
                .roles(Collections.singletonList("ROLE_USER"))
                .oAuthProvider("apple")
                .oAuthProviderId(sub)
                .enabled(true)
                .build();

        return userRepository.save(newUser);
    }

    private Mono<ResponseEntity<Void>> createAuthenticationResponse(User user, ServerWebExchange exchange) {
        // Generate tokens for the authenticated user
        String accessToken = authService.generateAccessToken(user);
        String refreshToken = authService.generateRefreshToken(user);

        // Configure token expiration times
        long accessTokenExpiration = authService.getAccessTokenExpiration();
        long refreshTokenExpiration = authService.getRefreshTokenExpiration();

        // Create response
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(accessTokenExpiration)
                .refreshExpiresIn(refreshTokenExpiration)
                .build();

        // Set cookies
        ResponseCookie accessTokenCookie = CookieUtil.createAccessTokenCookie(
                tokenResponse.getAccessToken(), tokenResponse.getExpiresIn());
        ResponseCookie refreshTokenCookie = CookieUtil.createRefreshTokenCookie(
                tokenResponse.getRefreshToken(), tokenResponse.getRefreshExpiresIn());

        exchange.getResponse().addCookie(accessTokenCookie);
        exchange.getResponse().addCookie(refreshTokenCookie);

        // Update user's refresh token in database
        return authService.saveUserRefreshToken(user, refreshToken)
                .then(Mono.just(ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(redirectSuccessUrl + "?token=" + accessToken))
                        .build()));
    }
}