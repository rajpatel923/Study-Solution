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
        if (secret == null || secret.getBytes().length < 32) {
            // Log a warning but don't throw an exception to prevent application startup failure
            log.warn("JWT secret is too short for secure HMAC-SHA-512. It should be at least 32 bytes (256 bits).");

            // Pad the secret if it's too short (not recommended for production, but prevents immediate failure)
            String paddedSecret = secret;
            while (paddedSecret.getBytes().length < 64) {
                paddedSecret += secret;
            }
            secret = paddedSecret.substring(0, 64);

            log.info("JWT secret has been padded to an appropriate length.");
        }

        try {
            // Generate key from secret
            this.key = Keys.hmacShaKeyFor(secret.getBytes());
            log.info("JWT signing key initialized successfully");
        } catch (Exception e) {
            log.error("Failed to initialize JWT key: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to initialize JWT key", e);
        }
    }

    public String generateAccessToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", user.getRoles());
        claims.put("userId", user.getId().toString());
        claims.put("username", user.getUsername());
        claims.put("email", user.getEmail());
        return createToken(claims, user.getUsername(), accessTokenExpiration);
    }

    public String generateRefreshToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("type", "refresh");
        return createToken(claims, user.getUsername(), refreshTokenExpiration);
    }

    private String createToken(Map<String, Object> claims, String subject, long expiration) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(key, SignatureAlgorithm.HS512)
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
        } catch (UnsupportedJwtException e) {
            log.error("Token validation failed: Unsupported JWT");
            return false;
        } catch (MalformedJwtException e) {
            log.error("Token validation failed: Malformed JWT");
            return false;
        } catch (SignatureException e) {
            log.error("Token validation failed: Invalid signature");
            return false;
        } catch (IllegalArgumentException e) {
            log.error("Token validation failed: Invalid argument");
            return false;
        } catch (Exception e) {
            log.error("Token validation failed: Unexpected error - {}", e.getMessage());
            return false;
        }
    }

    public void logTokenInfo(String token) {
        try {
            if (token == null || token.isEmpty()) {
                log.warn("Cannot log token info: Token is null or empty");
                return;
            }

            // Split the token to inspect headers and payload
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                log.warn("Token does not have the expected JWT format (header.payload.signature)");
                return;
            }

            // Decode header
            String header = new String(Base64.getDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            log.debug("Token header: {}", header);

            // For debugging only - don't log full payload in production
            if (log.isDebugEnabled()) {
                // Decode part of the payload (first 20 chars only)
                String decodedPayload = new String(Base64.getDecoder().decode(parts[1]), StandardCharsets.UTF_8);
                if (decodedPayload.length() > 20) {
                    decodedPayload = decodedPayload.substring(0, 20) + "...";
                }
                log.debug("Token payload preview: {}", decodedPayload);
            }

            // Log signature length
            log.debug("Token signature length: {} bytes", parts[2].length());

        } catch (Exception e) {
            log.warn("Failed to parse token: {}", e.getMessage());
        }
    }
}
