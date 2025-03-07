package com.studysolution.studysync.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studysolution.studysync.models.LoginRequest;
import com.studysolution.studysync.models.RegisterRequest;
import com.studysolution.studysync.models.TokenResponse;
import com.studysolution.studysync.services.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public Mono<ResponseEntity<TokenResponse>> register(@RequestBody RegisterRequest request) {
        return authService.register(request)
                .map(tokenResponse -> ResponseEntity.status(HttpStatus.CREATED).body(tokenResponse));
    }

    @PostMapping("/login")
    public Mono<ResponseEntity<TokenResponse>> login(@RequestBody LoginRequest request, ServerWebExchange exchanged) {
        return authService.login(request)
                .map(tokenResponse -> {
                            ResponseCookie accessToken = ResponseCookie.from("accessToken", tokenResponse.getAccessToken())
                                    .httpOnly(true)
                                    .secure(true)
                                    .path("/")
                                    .maxAge(tokenResponse.getExpiresIn())
                                    .build();
                            ResponseCookie refreshToken = ResponseCookie.from("refreshToken", tokenResponse.getRefreshToken())
                                            .httpOnly(true)
                                            .secure(true)
                                            .path("/")
                                            .maxAge(tokenResponse.getExpiresIn())
                                            .build();

                            exchanged.getResponse().addCookie(accessToken);
                            exchanged.getResponse().addCookie(refreshToken);
                        return ResponseEntity.ok(tokenResponse);
                }
                )
                .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/refresh")
    public Mono<ResponseEntity<TokenResponse>> refreshToken(@RequestHeader("Authorization") String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String refreshToken = authorization.substring(7);
            return authService.refreshToken(refreshToken)
                    .map(ResponseEntity::ok)
                    .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }
        return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/logout")
    public Mono<ResponseEntity<Void>> logout(@RequestHeader("Authorization") String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String token = authorization.substring(7);
            return authService.logout(token)
                    .thenReturn(ResponseEntity.ok().build());
        }
        return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }
}
