package com.studysolution.studysync.filter;

import com.studysolution.studysync.repository.UserRepository;
import com.studysolution.studysync.services.AuthService;
import com.studysolution.studysync.utils.CookieUtil;
import com.studysolution.studysync.utils.JwtUtil;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuthenticationFilter implements WebFilter {
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final AuthService authService;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        String method = request.getMethod().toString();

        log.debug("Processing {} request for path: {}", method, path);

        // Skip authentication for whitelisted paths
        if (isWhiteListed(path) || request.getMethod().equals(HttpMethod.OPTIONS)) {
            log.debug("Skipping auth for whitelisted path or OPTIONS request");
            return chain.filter(exchange);
        }

        // Extract access token from different sources
        String accessToken = extractAccessToken(request);

        // Check if access token is valid
        boolean isAccessTokenValid = false;

        try {
            isAccessTokenValid = accessToken != null && jwtUtil.validateToken(accessToken);
        } catch (Exception e) {
            log.debug("Access token validation failed: {}", e.getMessage());
        }

        if (isAccessTokenValid) {
            // Process with valid access token
            try {
                Claims claims = jwtUtil.getAllClaimsFromToken(accessToken);
                String username = claims.getSubject();
                String userId = claims.get("uid", String.class);

                // Fallback to old claim name if needed
                if (userId == null) {
                    userId = claims.get("userId", String.class);
                }

                final String finalUserId = userId;

                return userRepository.findById(userId)
                        .switchIfEmpty(userRepository.findByUsername(username))
                        .flatMap(user -> {
                            // Create authorities from user roles
                            List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                                    .map(SimpleGrantedAuthority::new)
                                    .collect(Collectors.toList());

                            // Create authentication object
                            Authentication authentication = new UsernamePasswordAuthenticationToken(
                                    username, null, authorities);

                            log.debug("Setting headers - X-User-ID: {}, method: {}", user.getId(), method);

                            // Create new exchange with modified request
                            ServerWebExchange mutatedExchange = exchange.mutate()
                                    .request(request.mutate()
                                            .header("X-User-ID", String.valueOf(user.getId()))
                                            .header("X-User-Name", username)
                                            .header("userId", String.valueOf(user.getId()))
                                            .build())
                                    .build();

                            // Continue with filter chain with authentication context
                            return chain.filter(mutatedExchange)
                                    .contextWrite(ReactiveSecurityContextHolder.withAuthentication(authentication));
                        })
                        .onErrorResume(e -> {
                            log.error("Error loading user: {}", e.getMessage());
                            return handleAuthFailure(exchange, "Error loading user credentials");
                        });

            } catch (Exception e) {
                log.error("Authentication error: {}", e.getMessage());
                return handleAuthFailure(exchange, "Invalid authentication credentials");
            }
        } else {
            // Access token is missing or invalid, try to use refresh token
            String refreshToken = extractRefreshToken(request);
            if (refreshToken == null) {
                return handleAuthFailure(exchange, "Authentication required");
            }

            return authService.refreshToken(refreshToken)
                    .flatMap(tokenResponse -> {
                        log.debug("Successfully refreshed tokens");

                        // Set new cookies
                        ResponseCookie accessTokenCookie = CookieUtil.createAccessTokenCookie(
                                tokenResponse.getAccessToken(), tokenResponse.getExpiresIn());
                        ResponseCookie refreshTokenCookie = CookieUtil.createRefreshTokenCookie(
                                tokenResponse.getRefreshToken(), tokenResponse.getRefreshExpiresIn());

                        exchange.getResponse().addCookie(accessTokenCookie);
                        exchange.getResponse().addCookie(refreshTokenCookie);

                        // Create a recursive call with the new access token
                        ServerWebExchange mutatedExchange = exchange.mutate()
                                .request(request.mutate()
                                        .header("Authorization", "Bearer " + tokenResponse.getAccessToken())
                                        .build())
                                .build();

                        return filter(mutatedExchange, chain);
                    })
                    .onErrorResume(e -> {
                        log.error("Token refresh failed: {}", e.getMessage());
                        clearExpiredTokenCookies(exchange.getResponse());
                        return handleAuthFailure(exchange, "Authentication session expired");
                    });
        }
    }

    private Mono<Void> handleAuthFailure(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("WWW-Authenticate", "Bearer error=\"invalid_token\", error_description=\"" + message + "\"");

        if (isApiRequest(exchange.getRequest())) {
            return response.setComplete();
        }

        response.setStatusCode(HttpStatus.FOUND);
        response.getHeaders().add(HttpHeaders.LOCATION, "/api/v1/auth/login");
        return response.setComplete();
    }

    private void clearExpiredTokenCookies(ServerHttpResponse response) {
        ResponseCookie clearAccessToken = CookieUtil.createClearCookie("accessToken");
        ResponseCookie clearRefreshToken = CookieUtil.createClearCookie("refreshToken");
        response.addCookie(clearAccessToken);
        response.addCookie(clearRefreshToken);
    }

    private boolean isApiRequest(ServerHttpRequest request) {
        String accept = request.getHeaders().getFirst(HttpHeaders.ACCEPT);
        return accept != null &&
                (accept.contains("application/json") ||
                        accept.contains("application/xml") ||
                        request.getPath().toString().startsWith("/api/"));
    }

    private String extractAccessToken(ServerHttpRequest request) {
        return CookieUtil.extractAccessToken(request);
    }

    private String extractRefreshToken(ServerHttpRequest request) {
        return CookieUtil.extractRefreshToken(request);
    }

    private boolean isWhiteListed(String path) {
        return path.startsWith("/api/v1/auth/") ||
                path.startsWith("/api/v1/public/");
    }
}