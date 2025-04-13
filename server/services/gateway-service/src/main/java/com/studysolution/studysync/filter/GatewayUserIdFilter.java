package com.studysolution.studysync.filter;

import com.studysolution.studysync.utils.CookieUtil;
import com.studysolution.studysync.utils.JwtUtil;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Spring Cloud Gateway Global Filter to propagate user ID to downstream services
 * for all HTTP methods, especially working with POST requests.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GatewayUserIdFilter implements GlobalFilter, Ordered {

    private final JwtUtil jwtUtil;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        HttpMethod method = request.getMethod();
        String path = request.getPath().value();

        log.debug("GatewayUserIdFilter: Processing {} request for {}", method, path);

        // Skip auth paths and OPTIONS requests
        if (isSkippablePath(path) || HttpMethod.OPTIONS.equals(method)) {
            return chain.filter(exchange);
        }

        // Check if headers already present
        if (request.getHeaders().containsKey("X-User-ID")) {
            log.debug("X-User-ID already present: {}", request.getHeaders().getFirst("X-User-ID"));
            return chain.filter(exchange);
        }

        // Extract and validate JWT token
        String accessToken = CookieUtil.extractAccessToken(request);
        if (accessToken == null || accessToken.isEmpty()) {
            log.debug("No access token found in request");
            return chain.filter(exchange);
        }

        try {
            if (jwtUtil.validateToken(accessToken)) {
                Claims claims = jwtUtil.getAllClaimsFromToken(accessToken);
                String userId = claims.get("uid", String.class);

                // Fallback to old claim name
                if (userId == null) {
                    userId = claims.get("userId", String.class);
                }

                if (userId != null) {
                    log.debug("Adding user ID header for {} request: {}", method, userId);
                    String username = claims.getSubject();

                    // Build new request with added headers
                    ServerHttpRequest modifiedRequest = request.mutate()
                            .header("X-User-ID", userId)
                            .header("X-User-Name", username)
                            .header("userId", userId)
                            .build();

                    // Build new exchange with the modified request
                    ServerWebExchange modifiedExchange = exchange.mutate()
                            .request(modifiedRequest)
                            .build();

                    // Continue with the modified exchange
                    return chain.filter(modifiedExchange);
                }
            }
        } catch (Exception e) {
            log.error("Error processing JWT token: {}", e.getMessage());
        }

        // Continue with original exchange if token processing failed
        return chain.filter(exchange);
    }

    private boolean isSkippablePath(String path) {
        return path.startsWith("/api/v1/auth/") ||
                path.startsWith("/api/v1/public/") ||
                path.equals("/favicon.ico");
    }

    @Override
    public int getOrder() {
        // Run after security filters but before routing
        return Ordered.LOWEST_PRECEDENCE - 100;
    }
}