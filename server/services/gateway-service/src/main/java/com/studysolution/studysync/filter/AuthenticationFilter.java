package com.studysolution.studysync.filter;

import com.studysolution.studysync.utils.JwtUtil;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
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

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        if (isWhiteListed(path) || request.getMethod().equals(HttpMethod.OPTIONS)) {
            return chain.filter(exchange);
        }

        String token = null;

        // Extract authentication header
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }
        // If no valid header, then try to get token from cookies
        else if (request.getCookies().containsKey("accessToken")) {
            token = request.getCookies().getFirst("accessToken").getValue();
        }

        // If token is missing or invalid, return unauthorized
        if (token == null || !jwtUtil.validateToken(token)) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // Extract claims and build authentication
        Claims claims = jwtUtil.getAllClaimsFromToken(token);
        String username = claims.getSubject();
        List<String> roles = claims.get("roles", List.class);

        // Create authentication object
        List<SimpleGrantedAuthority> authorities = roles.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                username, null, authorities);

        // Add user info to request headers for downstream services
        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header("X-User-ID", claims.get("userId", String.class))
                .header("X-User-Name", claims.get("username", String.class))
                .header("X-User-Roles", String.join(",", roles))
                .build();

        // Continue with filter chain with authentication context
        return chain.filter(exchange.mutate().request(mutatedRequest).build())
                .contextWrite(ReactiveSecurityContextHolder.withAuthentication(authentication));
    }

    private boolean isWhiteListed(String path) {
        return path.startsWith("/api/v1/auth/") ||
                path.startsWith("/api/v1/public/");
    }
}
