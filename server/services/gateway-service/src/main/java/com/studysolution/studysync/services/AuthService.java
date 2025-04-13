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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;

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
                    LocalDateTime expiryTime = calculateExpiryTime(jwtUtil.getRefreshTokenExpiration());

                    // Update user with refresh token info
                    savedUser.setRefreshToken(refreshToken);
                    savedUser.setRefreshTokenExpiryDate(expiryTime);

                    log.info("Created refresh token for user: {}", savedUser.getUsername());

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
                    LocalDateTime expiryTime = calculateExpiryTime(jwtUtil.getRefreshTokenExpiration());

                    // Update user with refresh token
                    user.setRefreshToken(refreshToken);
                    user.setRefreshTokenExpiryDate(expiryTime);

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
        if (refreshToken == null || refreshToken.isEmpty()) {
            log.debug("Refresh token is missing");
            return Mono.error(new RuntimeException("Refresh token is missing"));
        }

        // Trim and clean up token
        refreshToken = refreshToken.trim();
        if (refreshToken.startsWith("Bearer ")) {
            refreshToken = refreshToken.substring(7).trim();
        }

        // Log a portion of the token for debugging
        if (log.isDebugEnabled()) {
            String tokenPreview = refreshToken.length() > 10 ?
                    refreshToken.substring(0, 10) + "..." : refreshToken;
            log.debug("Processing refresh token: {}", tokenPreview);
        }

        try {
            // Validate token format and signature
            if (!jwtUtil.validateToken(refreshToken)) {
                log.debug("Invalid refresh token (failed validation)");
                return Mono.error(new RuntimeException("Invalid refresh token"));
            }
        } catch (Exception e) {
            log.debug("Token validation error: {}", e.getMessage());
            return Mono.error(new RuntimeException("Invalid refresh token: " + e.getMessage()));
        }

        // Final refresh token for lambda
        final String finalRefreshToken = refreshToken;


        return userRepository.findByRefreshToken(finalRefreshToken)
                .doOnNext(user -> log.debug("Found user: {} with refresh token", user.getUsername()))
                .filter(this::isRefreshTokenValid)
                .flatMap(user -> {
                    // Generate new access token
                    String newAccessToken = jwtUtil.generateAccessToken(user);

                    // Generate new refresh token
                    String newRefreshToken = jwtUtil.generateRefreshToken(user);

                    // Calculate and format new expiry time
                    LocalDateTime expiryTime = calculateExpiryTime(jwtUtil.getRefreshTokenExpiration());

                    // Update user with new refresh token
                    user.setRefreshToken(newRefreshToken);
                    user.setRefreshTokenExpiryDate(expiryTime);
                    
                    log.debug("Generated new access and refresh tokens for user: {}", user.getUsername());

                    // Save updated user
                    return userRepository.save(user)
                            .map(updatedUser -> new TokenResponse(
                                    newAccessToken,
                                    newRefreshToken,
                                    jwtUtil.getAccessTokenExpiration(),
                                    jwtUtil.getRefreshTokenExpiration()
                            ));
                })
                .switchIfEmpty(Mono.error(new RuntimeException("Invalid refresh token or token expired")));
    }
    /**
     * Logout user by invalidating refresh token
     */
    public Mono<Void> logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isEmpty()) {
            return Mono.empty(); // Nothing to logout
        }

        return userRepository.findByRefreshToken(refreshToken)
                .flatMap(user -> {
                    // Clear refresh token data
                    user.setRefreshToken(null);
                    user.setRefreshTokenExpiryDate(null);
                    return userRepository.save(user);
                })
                .then();
    }

    public Mono<User> getUserFromToken(String accessToken) {
        if (accessToken == null || accessToken.isEmpty()) {
            return Mono.error(new RuntimeException("Token is missing"));
        }

        // Clean up token if it includes "Bearer "
        if (accessToken.startsWith("Bearer ")) {
            accessToken = accessToken.substring(7);
        }

        try {
            // Verify token is valid
            if (!jwtUtil.validateToken(accessToken)) {
                return Mono.error(new RuntimeException("Invalid token"));
            }

            // Extract claims from token
            Claims claims = jwtUtil.getAllClaimsFromToken(accessToken);

            // Extract user ID from the claims
            String userId = claims.get("uid", String.class);

            if (userId == null) {
                // Try to find by username as fallback
                String username = claims.getSubject();
                return userRepository.findByUsername(username)
                        .switchIfEmpty(Mono.error(new RuntimeException("User not found")));
            }

            // Find the user by ID
            return userRepository.findById(userId)
                    .switchIfEmpty(Mono.error(new RuntimeException("User not found")));

        } catch (ExpiredJwtException e) {
            return Mono.error(new RuntimeException("Token has expired"));
        } catch (JwtException e) {
            return Mono.error(new RuntimeException("Invalid token"));
        } catch (Exception e) {
            return Mono.error(new RuntimeException("Error processing token"));
        }
    }

    /**
     * Check if the user's refresh token is still valid by comparing the expiry date
     */
    private boolean isRefreshTokenValid(User user) {
        if (user.getRefreshToken() == null || user.getRefreshTokenExpiryDate() == null) {
            return false;
        }

        try {
            return LocalDateTime.now().isBefore(user.getRefreshTokenExpiryDate());
        } catch (Exception e) {
            log.error("Error comparing refresh token expiry date", e);
            return false;
        }
    }

    /**
     * Calculate the expiry time from now plus the given duration in seconds
     */
    private LocalDateTime calculateExpiryTime(long durationInMillis) {
        // Set a reasonable expiry period - max 30 days
        long durationInSeconds = durationInMillis / 1000;
        long actualDuration = Math.min(durationInSeconds, 30 * 24 * 60 * 60);
        return LocalDateTime.now().plusSeconds(actualDuration);
    }

    /**
            * Generate access token for a user (needed by OAuth2 success handler)
    */
    public String generateAccessToken(User user) {
        return jwtUtil.generateAccessToken(user);
    }

    /**
     * Generate refresh token for a user (needed by OAuth2 success handler)
     */
    public String generateRefreshToken(User user) {
        return jwtUtil.generateRefreshToken(user);
    }

    /**
     * Get access token expiration time in milliseconds
     */
    public long getAccessTokenExpiration() {
        return jwtUtil.getAccessTokenExpiration();
    }

    /**
     * Get refresh token expiration time in milliseconds
     */
    public long getRefreshTokenExpiration() {
        return jwtUtil.getRefreshTokenExpiration();
    }

    /**
     * Save user's refresh token to database
     */
    public Mono<User> saveUserRefreshToken(User user, String refreshToken) {
        // Calculate and format expiry time
        LocalDateTime expiryTime = calculateExpiryTime(jwtUtil.getRefreshTokenExpiration());

        // Update user with refresh token info
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiryDate(expiryTime);

        // Save updated user
        return userRepository.save(user);
    }
}