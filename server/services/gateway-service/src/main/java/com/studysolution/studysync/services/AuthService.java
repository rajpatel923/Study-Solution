package com.studysolution.studysync.services;

import com.studysolution.studysync.models.LoginRequest;
import com.studysolution.studysync.models.RegisterRequest;
import com.studysolution.studysync.models.TokenResponse;
import com.studysolution.studysync.models.User;
import com.studysolution.studysync.repository.UserRepository;
import com.studysolution.studysync.utils.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // Date formatter for storing expiry dates
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;

    /**
     * Register a new user
     */
    public Mono<TokenResponse> register(RegisterRequest request) {
        // Check if username already exists
        return userRepository.findByUsername(request.getUsername())
                .flatMap(existingUser -> Mono.<TokenResponse>error(new RuntimeException("Username already exists")))
                .switchIfEmpty(createUser(request));
    }

    private Mono<TokenResponse> createUser(RegisterRequest request) {
        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .roles(Arrays.asList("ROLE_USER"))
                .enabled(true)
                .build();

        return userRepository.save(user)
                .flatMap(savedUser -> {
                    // Generate tokens
                    String accessToken = jwtUtil.generateAccessToken(savedUser);
                    String refreshToken = jwtUtil.generateRefreshToken(savedUser);

                    // Calculate and format expiry time
                    String expiryTime = calculateExpiryTime(jwtUtil.getRefreshTokenExpiration());

                    // Update user with refresh token info
                    savedUser.setRefreshToken(refreshToken);
                    savedUser.setRefreshTokenExpiryDate(expiryTime);

                    log.info("Created refresh token for user: {}, expires: {}", savedUser.getUsername(), expiryTime);

                    // Save updated user with refresh token
                    return userRepository.save(savedUser)
                            .map(updatedUser -> new TokenResponse(
                                    accessToken,
                                    refreshToken,
                                    jwtUtil.getAccessTokenExpiration(),
                                    jwtUtil.getRefreshTokenExpiration()
                            ));
                });
    }

    /**
     * Authenticate user and generate tokens
     */
    public Mono<TokenResponse> login(LoginRequest request) {
        return userRepository.findByUsername(request.getUsername())
                .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPassword()))
                .flatMap(user -> {
                    // Generate new access token
                    String accessToken = jwtUtil.generateAccessToken(user);

                    // Check if the existing refresh token is still valid
                    if (isRefreshTokenValid(user)) {
                        log.info("Reusing existing valid refresh token for user: {}", user.getUsername());

                        // Reuse existing refresh token
                        return Mono.just(TokenResponse.builder()
                                .accessToken(accessToken)
                                .refreshToken(user.getRefreshToken())
                                .expiresIn(jwtUtil.getAccessTokenExpiration())
                                .refreshExpiresIn(jwtUtil.getRefreshTokenExpiration())
                                .build());
                    }

                    // Generate new refresh token only if needed
                    String refreshToken = jwtUtil.generateRefreshToken(user);
                    String expiryTime = calculateExpiryTime(jwtUtil.getRefreshTokenExpiration());

                    // Update user with refresh token
                    user.setRefreshToken(refreshToken);
                    user.setRefreshTokenExpiryDate(expiryTime);

                    log.info("Created new refresh token on login for user: {}, expires: {}",
                            user.getUsername(), expiryTime);

                    // Save updated user
                    return userRepository.save(user)
                            .map(updatedUser -> TokenResponse.builder()
                                    .accessToken(accessToken)
                                    .refreshToken(refreshToken)
                                    .expiresIn(jwtUtil.getAccessTokenExpiration())
                                    .refreshExpiresIn(jwtUtil.getRefreshTokenExpiration())
                                    .build()
                            );
                })
                .switchIfEmpty(Mono.error(new RuntimeException("Invalid credentials")));
    }

    /**
     * Generate new access token using refresh token
     */
    public Mono<TokenResponse> refreshToken(String refreshToken) {
        log.info("Refresh token requested (length: {})",
                refreshToken != null ? refreshToken.length() : 0);

        if (refreshToken == null || refreshToken.isEmpty()) {
            return Mono.error(new RuntimeException("Refresh token is missing"));
        }

        // Clean up token if it includes "Bearer "
        if (refreshToken.startsWith("Bearer ")) {
            refreshToken = refreshToken.substring(7);
            log.debug("Stripped Bearer prefix from refresh token");
        }

        // Use enhanced validation with logging
        if (!validateTokenWithLogging(refreshToken)) {
            log.error("Invalid refresh token format or signature");
            return Mono.error(new RuntimeException("Invalid refresh token"));
        }

        // Final refresh token for lambda
        final String finalRefreshToken = refreshToken;

        return userRepository.findByRefreshToken(finalRefreshToken)
                .doOnNext(user -> log.debug("Found user by refresh token: {}", user.getUsername()))
                .filter(user -> {
                    boolean valid = isRefreshTokenValid(user);
                    if (!valid) {
                        log.warn("Refresh token validation failed for user: {}", user.getUsername());
                    }
                    return valid;
                })
                .flatMap(user -> {
                    // Generate new access token
                    String newAccessToken = jwtUtil.generateAccessToken(user);

                    // Generate new refresh token
                    String newRefreshToken = jwtUtil.generateRefreshToken(user);

                    // Calculate and format new expiry time
                    String expiryTime = calculateExpiryTime(jwtUtil.getRefreshTokenExpiration());

                    log.info("Refreshing token for user: {}, new expiry: {}", user.getUsername(), expiryTime);

                    // Update user with new refresh token
                    user.setRefreshToken(newRefreshToken);
                    user.setRefreshTokenExpiryDate(expiryTime);

                    // Save updated user
                    return userRepository.save(user)
                            .map(updatedUser -> new TokenResponse(
                                    newAccessToken,
                                    newRefreshToken,
                                    jwtUtil.getAccessTokenExpiration(),
                                    jwtUtil.getRefreshTokenExpiration()
                            ));
                })
                .switchIfEmpty(Mono.defer(() -> {
                    log.error("No user found with the provided refresh token");
                    return Mono.error(new RuntimeException("Invalid refresh token or token expired"));
                }));
    }

    /**
     * Logout user by invalidating refresh token
     */
    public Mono<Void> logout(String refreshToken) {
        return userRepository.findByRefreshToken(refreshToken)
                .flatMap(user -> {
                    // Clear refresh token data
                    user.setRefreshToken(null);
                    user.setRefreshTokenExpiryDate(null);
                    log.info("Logging out user: {}, clearing refresh token", user.getUsername());
                    return userRepository.save(user);
                })
                .then();
    }

    public Mono<User> getUserFromToken(String accessToken) {
        try {
            if (accessToken == null || accessToken.isEmpty()) {
                log.error("Token is missing or empty");
                return Mono.error(new RuntimeException("Token is missing"));
            }

            // Clean up token if it includes "Bearer "
            if (accessToken.startsWith("Bearer ")) {
                accessToken = accessToken.substring(7);
            }

            // Log token length for debugging
            log.debug("Processing token of length: {}", accessToken.length());

            // Use enhanced validation with logging
            if (!validateTokenWithLogging(accessToken)) {
                return Mono.error(new RuntimeException("Invalid token"));
            }

            // Extract claims from token
            Claims claims;
            try {
                claims = jwtUtil.getAllClaimsFromToken(accessToken);
            } catch (Exception e) {
                log.error("Failed to extract claims from token: {}", e.getMessage());
                return Mono.error(new RuntimeException("Failed to extract claims from token"));
            }

            // Log available claims for debugging
            log.debug("Token claims: {}", claims.keySet());

            // Extract user ID from the claims
            String userId = claims.get("userId", String.class);

            if (userId == null) {
                log.error("Missing userId claim in token");
                return Mono.error(new RuntimeException("Invalid token payload: missing userId"));
            }

            // Find the user by ID
            return userRepository.findById(userId)
                    .switchIfEmpty(Mono.defer(() -> {
                        log.error("User not found with ID: {}", userId);
                        return Mono.error(new RuntimeException("User not found"));
                    }));

        } catch (ExpiredJwtException e) {
            log.error("Token has expired: {}", e.getMessage());
            return Mono.error(new RuntimeException("Token has expired"));
        } catch (JwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
            return Mono.error(new RuntimeException("Invalid token structure"));
        } catch (Exception e) {
            log.error("Error processing token: {}", e.getMessage(), e);
            return Mono.error(new RuntimeException("Error processing token: " + e.getMessage()));
        }
    }

    /**
     * Check if the user's refresh token is still valid by comparing the expiry date
     */
    private boolean isRefreshTokenValid(User user) {
        if (user.getRefreshToken() == null || user.getRefreshTokenExpiryDate() == null) {
            log.info("Token validation failed - null token or expiry");
            return false;
        }

        try {
            LocalDateTime expiryDateTime = LocalDateTime.parse(user.getRefreshTokenExpiryDate(), DATE_FORMATTER);
            boolean isValid = LocalDateTime.now().isBefore(expiryDateTime);
            if (!isValid) {
                log.info("Token expired for user: {}, expiry was: {}", user.getUsername(), user.getRefreshTokenExpiryDate());
            }
            return isValid;
        } catch (Exception e) {
            log.error("Error parsing refresh token expiry date: {}", e.getMessage(), e);
            return false;
        }
    }

    public boolean validateTokenWithLogging(String token) {
        if (token == null || token.isEmpty()) {
            log.error("Token validation failed: Token is null or empty");
            return false;
        }

        try {
            // Log token details for debugging (partial token to avoid security issues)
            String tokenPrefix = token.length() > 10 ? token.substring(0, 10) + "..." : token;
            log.debug("Validating token: {}", tokenPrefix);

            boolean valid = jwtUtil.validateToken(token);
            log.debug("Token validation result: {}", valid);
            return valid;
        } catch (ExpiredJwtException e) {
            log.error("Token validation failed: Token has expired");
            return false;
        } catch (JwtException e) {
            log.error("Token validation failed: Invalid JWT structure - {}", e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("Token validation failed: Unexpected error - {}", e.getMessage());
            return false;
        }
    }


    /**
     * Calculate the expiry time from now plus the given duration in seconds
     * Using a simpler format to avoid exceeding VARCHAR limits
     */
    private String calculateExpiryTime(long durationInSeconds) {
        // Set a more reasonable expiry period - max 30 days
        long actualDuration = Math.min(durationInSeconds, 30 * 24 * 60 * 60);
        LocalDateTime expiryTime = LocalDateTime.now().plusSeconds(actualDuration);
        return expiryTime.format(DATE_FORMATTER);
    }




}
