package com.studysolution.studysync.controller;

import com.studysolution.studysync.DTO.UserDTO;
import com.studysolution.studysync.models.LoginRequest;
import com.studysolution.studysync.models.RegisterRequest;
import com.studysolution.studysync.models.TokenResponse;
import com.studysolution.studysync.models.User;
import com.studysolution.studysync.services.AuthService;
import com.studysolution.studysync.services.UserService;
import com.studysolution.studysync.utils.CookieUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

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
                    ResponseCookie accessToken = CookieUtil.createAccessTokenCookie(
                            tokenResponse.getAccessToken(), tokenResponse.getExpiresIn());
                    ResponseCookie refreshToken = CookieUtil.createRefreshTokenCookie(
                            tokenResponse.getRefreshToken(), tokenResponse.getRefreshExpiresIn());

                    exchange.getResponse().addCookie(accessToken);
                    exchange.getResponse().addCookie(refreshToken);

                    return ResponseEntity.status(HttpStatus.CREATED).body(tokenResponse);
                });
    }

    @PostMapping("/login")
    public Mono<ResponseEntity<TokenResponse>> login(@RequestBody LoginRequest request, ServerWebExchange exchange) {
        return authService.login(request)
                .map(tokenResponse -> {
                    ResponseCookie accessToken = CookieUtil.createAccessTokenCookie(
                            tokenResponse.getAccessToken(), tokenResponse.getExpiresIn());
                    ResponseCookie refreshToken = CookieUtil.createRefreshTokenCookie(
                            tokenResponse.getRefreshToken(), tokenResponse.getRefreshExpiresIn());

                    exchange.getResponse().addCookie(accessToken);
                    exchange.getResponse().addCookie(refreshToken);

                    return ResponseEntity.ok(tokenResponse);
                })
                .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/refresh")
    public Mono<ResponseEntity<TokenResponse>> refreshToken(ServerWebExchange exchange) {
        // Get refresh token from cookie or header
        String refreshToken = CookieUtil.extractRefreshToken(exchange.getRequest());
        log.debug("Refresh token from request: {}", refreshToken != null ? "present" : "not found");

        if (refreshToken == null) {
            return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }

        return authService.refreshToken(refreshToken)
                .map(tokenResponse -> {
                    // Set new cookies
                    ResponseCookie accessToken = CookieUtil.createAccessTokenCookie(
                            tokenResponse.getAccessToken(), tokenResponse.getExpiresIn());
                    ResponseCookie newRefreshToken = CookieUtil.createRefreshTokenCookie(
                            tokenResponse.getRefreshToken(), tokenResponse.getRefreshExpiresIn());

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

    @PostMapping("/logout")
    public Mono<ResponseEntity<Void>> logout(ServerWebExchange exchange) {

        // Clear cookies first
        ResponseCookie clearAccessToken = CookieUtil.createClearCookie("accessToken");
        ResponseCookie clearRefreshToken = CookieUtil.createClearCookie("refreshToken");

        exchange.getResponse().addCookie(clearAccessToken);
        exchange.getResponse().addCookie(clearRefreshToken);

        // Also invalidate token from cookie or header
        String refreshToken = CookieUtil.extractRefreshToken(exchange.getRequest());
        if (refreshToken != null) {
            return authService.logout(refreshToken)
                    .thenReturn(ResponseEntity.ok().build());
        }

        // Return OK even if no token found since cookies are cleared
        return Mono.just(ResponseEntity.ok().build());
    }

    @GetMapping("/me")
    public Mono<ResponseEntity<UserDTO>> getCurrentUser(ServerWebExchange exchange) {
        // Get access token from cookie or header
        String accessToken = CookieUtil.extractAccessToken(exchange.getRequest());

        // If no token, return unauthorized
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
}