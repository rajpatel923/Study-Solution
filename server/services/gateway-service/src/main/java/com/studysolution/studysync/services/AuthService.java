package com.studysolution.studysync.services;

import com.studysolution.studysync.models.LoginRequest;
import com.studysolution.studysync.models.RegisterRequest;
import com.studysolution.studysync.models.TokenResponse;
import com.studysolution.studysync.models.User;
import com.studysolution.studysync.repository.UserRepository;
import com.studysolution.studysync.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
//    private final ReactiveRedisTemplate<String, User> redisTemplate;
private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // In-memory storage for refresh tokens (consider using a persistent store in production)
    private final Map<String, User> refreshTokenStore = new HashMap<>();

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

                    // Store refresh token
                    refreshTokenStore.put(refreshToken, savedUser);

                    return Mono.just(new TokenResponse(accessToken, refreshToken));
                });
    }

    /**
     * Authenticate user and generate tokens
     */
    public Mono<TokenResponse> login(LoginRequest request) {
        return userRepository.findByUsername(request.getUsername())
                .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPassword()))
                .flatMap(user -> {
                    // Generate tokens
                    String accessToken = jwtUtil.generateAccessToken(user);
                    String refreshToken = jwtUtil.generateRefreshToken(user);

                    // Store refresh token
                    refreshTokenStore.put(refreshToken, user);

                    return Mono.just(new TokenResponse(accessToken, refreshToken));
                });
    }

    /**
     * Generate new access token using refresh token
     */
    public Mono<TokenResponse> refreshToken(String refreshToken) {
        if (!jwtUtil.validateToken(refreshToken)) {
            return Mono.empty();
        }

        User user = refreshTokenStore.get(refreshToken);
        if (user == null) {
            return Mono.empty();
        }

        // Generate new tokens
        String newAccessToken = jwtUtil.generateAccessToken(user);
        String newRefreshToken = jwtUtil.generateRefreshToken(user);

        // Invalidate old refresh token
        refreshTokenStore.remove(refreshToken);

        // Store new refresh token
        refreshTokenStore.put(newRefreshToken, user);

        return Mono.just(new TokenResponse(newAccessToken, newRefreshToken));
    }

    /**
     * Logout user by invalidating refresh token
     */
    public Mono<Void> logout(String token) {
        refreshTokenStore.remove(token);
        return Mono.empty();
    }
}
