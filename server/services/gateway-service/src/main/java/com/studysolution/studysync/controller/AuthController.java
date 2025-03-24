package com.studysolution.studysync.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studysolution.studysync.models.LoginRequest;
import com.studysolution.studysync.models.RegisterRequest;
import com.studysolution.studysync.models.TokenResponse;
import com.studysolution.studysync.models.User;
import com.studysolution.studysync.services.AuthService;
import com.studysolution.studysync.services.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/register")
    public Mono<ResponseEntity<TokenResponse>> register(@RequestBody RegisterRequest request, ServerWebExchange exchange) {
        return authService.register(request)
                .map(tokenResponse -> {
                    // Set cookies after registration
                    ResponseCookie accessToken = createAccessTokenCookie(tokenResponse.getAccessToken(), tokenResponse.getExpiresIn());
                    ResponseCookie refreshToken = createRefreshTokenCookie(tokenResponse.getRefreshToken(), tokenResponse.getRefreshExpiresIn());

                    exchange.getResponse().addCookie(accessToken);
                    exchange.getResponse().addCookie(refreshToken);

                    return ResponseEntity.status(HttpStatus.CREATED).body(tokenResponse);
                });
    }

    @PostMapping("/login")
    public Mono<ResponseEntity<TokenResponse>> login(@RequestBody LoginRequest request, ServerWebExchange exchange) {
        return authService.login(request)
                .map(tokenResponse -> {
                    ResponseCookie accessToken = createAccessTokenCookie(tokenResponse.getAccessToken(), tokenResponse.getExpiresIn());
                    ResponseCookie refreshToken = createRefreshTokenCookie(tokenResponse.getRefreshToken(), tokenResponse.getRefreshExpiresIn());

                    exchange.getResponse().addCookie(accessToken);
                    exchange.getResponse().addCookie(refreshToken);

                    return ResponseEntity.ok(tokenResponse);
                })
                .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/refresh")
    public Mono<ResponseEntity<TokenResponse>> refreshToken(ServerWebExchange exchange) {
        // Get refresh token from cookie
        String refreshToken = getRefreshTokenFromCookie(exchange.getRequest());
        log.debug("Refresh token from cookie: {}", refreshToken != null ? "present" : "not found");

        if (refreshToken != null) {
            return authService.refreshToken(refreshToken)
                    .map(tokenResponse -> {
                        // Set new cookies
                        ResponseCookie accessToken = createAccessTokenCookie(tokenResponse.getAccessToken(), tokenResponse.getExpiresIn());
                        ResponseCookie newRefreshToken = createRefreshTokenCookie(tokenResponse.getRefreshToken(), tokenResponse.getRefreshExpiresIn());

                        exchange.getResponse().addCookie(accessToken);
                        exchange.getResponse().addCookie(newRefreshToken);

                        return ResponseEntity.ok(tokenResponse);
                    })
                    .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build())
                    .onErrorResume(e -> {
                        log.error("Error refreshing token: {}", e.getMessage());
                        return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
                    });
        }

        // Also check header for backward compatibility
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String tokenFromHeader = authHeader.substring(7);
            log.debug("Using refresh token from Authorization header");

            return authService.refreshToken(tokenFromHeader)
                    .map(tokenResponse -> {
                        // Set new cookies
                        ResponseCookie accessToken = createAccessTokenCookie(tokenResponse.getAccessToken(), tokenResponse.getExpiresIn());
                        ResponseCookie newRefreshToken = createRefreshTokenCookie(tokenResponse.getRefreshToken(), tokenResponse.getRefreshExpiresIn());

                        exchange.getResponse().addCookie(accessToken);
                        exchange.getResponse().addCookie(newRefreshToken);

                        return ResponseEntity.ok(tokenResponse);
                    })
                    .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build())
                    .onErrorResume(e -> {
                        log.error("Error refreshing token from header: {}", e.getMessage());
                        return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
                    });
        }

        return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/logout")
    public Mono<ResponseEntity<Void>> logout(ServerWebExchange exchange) {
        // Clear cookies first
        ResponseCookie clearAccessToken = ResponseCookie.from("accessToken", "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .sameSite("Strict")
                .maxAge(0)
                .build();

        ResponseCookie clearRefreshToken = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .sameSite("Strict")
                .maxAge(0)
                .build();

        exchange.getResponse().addCookie(clearAccessToken);
        exchange.getResponse().addCookie(clearRefreshToken);

        // Also invalidate token from cookie or header
        String refreshToken = getRefreshTokenFromCookie(exchange.getRequest());
        if (refreshToken != null) {
            return authService.logout(refreshToken)
                    .thenReturn(ResponseEntity.ok().build());
        }

        // Check header for backward compatibility
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String tokenFromHeader = authHeader.substring(7);
            return authService.logout(tokenFromHeader)
                    .thenReturn(ResponseEntity.ok().build());
        }

        // Return OK even if no token found since cookies are cleared
        return Mono.just(ResponseEntity.ok().build());
    }

    @GetMapping("/me")
    public Mono<ResponseEntity<User>> getCurrentUser(ServerWebExchange exchange) {
        // Try cookie first
        String accessToken = getAccessTokenFromCookie(exchange.getRequest());

        // Log token source for debugging
        if (accessToken != null) {
            log.debug("Using access token from cookie");
        } else {
            log.debug("No access token found in cookie");
        }

        // Then try header if cookie is not available
        if (accessToken == null) {
            String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                accessToken = authHeader.substring(7);
                log.debug("Using access token from Authorization header");
            }
        }

        // If still no token, return unauthorized
        if (accessToken == null) {
            log.warn("No access token found in either cookie or header");
            return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }

        // Now process the token
        return authService.getUserFromToken(accessToken)
                .map(ResponseEntity::ok)
                .onErrorResume(e -> {
                    log.error("Error getting user from token: {}", e.getMessage());
                    return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
                });
    }

    // Helper method to extract the refresh token from cookies
    private String getRefreshTokenFromCookie(ServerHttpRequest request) {
        try {
            // Check if cookies exist
            if (request.getCookies() == null || request.getCookies().isEmpty()) {
                log.debug("No cookies found in the request");
                return null;
            }

            // Get all cookies with the name "refreshToken"
            List<String> refreshTokens = request.getCookies().get("refreshToken")
                    .stream()
                    .map(cookie -> cookie.getValue())
                    .filter(value -> value != null && !value.isEmpty())
                    .collect(Collectors.toList());

            if (refreshTokens.isEmpty()) {
                log.debug("No refresh token cookie found");
                return null;
            }

            if (refreshTokens.size() > 1) {
                log.warn("Multiple refresh token cookies found, using the first one");
            }

            String token = refreshTokens.get(0);
            // Log a masked version of the token for debugging
            log.debug("Found refresh token in cookie: {}...",
                    token.length() > 10 ? token.substring(0, 10) + "..." : token);

            return token;
        } catch (Exception e) {
            log.error("Error extracting refresh token from cookie: {}", e.getMessage());
            return null;
        }
    }

    private String getAccessTokenFromCookie(ServerHttpRequest request) {
        try {
            // Check if cookies exist
            if (request.getCookies() == null || request.getCookies().isEmpty()) {
                log.debug("No cookies found in the request");
                return null;
            }

            // Get all cookies with the name "accessToken"
            List<String> accessTokens = request.getCookies().get("accessToken")
                    .stream()
                    .map(cookie -> cookie.getValue())
                    .filter(value -> value != null && !value.isEmpty())
                    .collect(Collectors.toList());

            if (accessTokens.isEmpty()) {
                log.debug("No access token cookie found");
                return null;
            }

            if (accessTokens.size() > 1) {
                log.warn("Multiple access token cookies found, using the first one");
            }

            String token = accessTokens.get(0);
            // Log a masked version of the token for debugging
            log.debug("Found access token in cookie: {}...",
                    token.length() > 10 ? token.substring(0, 10) + "..." : token);

            return token;
        } catch (Exception e) {
            log.error("Error extracting access token from cookie: {}", e.getMessage());
            return null;
        }
    }

    private ResponseCookie createAccessTokenCookie(String token, long maxAge) {
        return ResponseCookie.from("accessToken", token)
                .httpOnly(true)
                .secure(true) // Change to false for local development without HTTPS
                .path("/")
                .sameSite("Strict")
                .maxAge(maxAge)
                .build();
    }

    private ResponseCookie createRefreshTokenCookie(String token, long maxAge) {
        return ResponseCookie.from("refreshToken", token)
                .httpOnly(true)
                .secure(true) // Change to false for local development without HTTPS
                .path("/")
                .sameSite("Strict")
                .maxAge(maxAge)
                .build();
    }
}