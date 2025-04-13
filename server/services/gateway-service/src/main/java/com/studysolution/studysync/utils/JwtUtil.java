package com.studysolution.studysync.utils;

import com.studysolution.studysync.models.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
@Data
@Slf4j
@RequiredArgsConstructor
public class JwtUtil {
    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    private Key key;

    @PostConstruct
    public void init() {
        // Check secret length - HMAC-SHA-512 requires at least 64 bytes
        if (secret == null || secret.isEmpty()) {
            throw new RuntimeException("JWT secret cannot be null or empty");
        }

        try {
            // Generate key from secret - always use StandardCharsets.UTF_8 for consistency
            this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
            log.info("JWT signing key initialized successfully");
        } catch (Exception e) {
            log.error("Failed to initialize JWT key: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to initialize JWT key", e);
        }
    }

    public String generateAccessToken(User user) {
        Map<String, Object> claims = new HashMap<>();

        // Add minimum required claims with short names to reduce token size
        claims.put("uid", user.getId().toString());

        // Completely exclude roles from token to reduce size
        // Roles will be loaded from database when needed

        return createToken(claims, user.getUsername(), accessTokenExpiration, SignatureAlgorithm.HS512);
    }

    public String generateRefreshToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("type", "refresh");
        return createToken(claims, user.getUsername(), refreshTokenExpiration, SignatureAlgorithm.HS256);
    }

    private String createToken(Map<String, Object> claims, String subject, long expiration, SignatureAlgorithm algorithm) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(key, algorithm)
                .compact();
    }

    public Claims getAllClaimsFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String getUsernameFromToken(String token) {
        return getAllClaimsFromToken(token).getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("Token validation failed: Token has expired");
            return false;
        } catch (UnsupportedJwtException | MalformedJwtException | SignatureException | IllegalArgumentException e) {
            log.error("Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    // This method is useful for debugging but should be disabled in production
    public void logTokenInfo(String token) {
        if (!log.isDebugEnabled()) {
            return; // Only run in debug mode
        }

        try {
            if (token == null || token.isEmpty()) {
                log.debug("Cannot log token info: Token is null or empty");
                return;
            }

            // Split the token to inspect headers and payload
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                log.debug("Token does not have the expected JWT format (header.payload.signature)");
                return;
            }

            // Decode header
            String header = new String(Base64.getDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            log.debug("Token header: {}", header);

            // For debugging only - decode first 20 chars of payload
            String decodedPayload = new String(Base64.getDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            if (decodedPayload.length() > 20) {
                decodedPayload = decodedPayload.substring(0, 20) + "...";
            }
            log.debug("Token payload preview: {}", decodedPayload);

            // Log signature length
            log.debug("Token signature length: {} bytes", parts[2].length());
        } catch (Exception e) {
            log.debug("Failed to parse token: {}", e.getMessage());
        }
    }
}