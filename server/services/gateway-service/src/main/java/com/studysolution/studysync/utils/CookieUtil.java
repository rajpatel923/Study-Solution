package com.studysolution.studysync.utils;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpCookie;
import org.springframework.http.ResponseCookie;
import org.springframework.http.server.reactive.ServerHttpRequest;

import java.util.List;

/**
 * Utility class for handling JWT cookies consistently across the application
 */
@Slf4j
public class CookieUtil {

    /**
     * Creates a secure cookie for storing the access token
     */
    public static ResponseCookie createAccessTokenCookie(String token, long maxAge) {
        return ResponseCookie.from("accessToken", token)
                .httpOnly(true)
                .secure(true) // Change to false for local development without HTTPS
                .path("/")
                .sameSite("Strict")
                .maxAge(maxAge/1000)
                .build();
    }

    /**
     * Creates a secure cookie for storing the refresh token
     */
    public static ResponseCookie createRefreshTokenCookie(String token, long maxAge) {
        return ResponseCookie.from("refreshToken", token)
                .httpOnly(true)
                .secure(true) // Change to false for local development without HTTPS
                .path("/")
                .sameSite("Strict")
                .maxAge(maxAge/1000)
                .build();
    }

    /**
     * Creates cookies to clear token cookies (for logout)
     */
    public static ResponseCookie createClearCookie(String name) {
        return ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .sameSite("Strict")
                .maxAge(0)
                .build();
    }

    /**
     * Extracts the refresh token from request cookies or header
     */
    public static String extractRefreshToken(ServerHttpRequest request) {
        try {
            // Try cookie first
            List<HttpCookie> cookies = request.getCookies().get("refreshToken");
            if (cookies != null && !cookies.isEmpty()) {
                String token = cookies.get(0).getValue();
                if (token != null && !token.isEmpty()) {
                    log.debug("Found refresh token in cookie: {}...",
                            token.length() > 10 ? token.substring(0, 10) + "..." : token);
                    return token;
                }
            }

            // Then try header for backward compatibility
            String authHeader = request.getHeaders().getFirst("Refresh-Token");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                log.debug("Using refresh token from header");
                return authHeader.substring(7);
            }

            return null;
        } catch (Exception e) {
            log.error("Error extracting refresh token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extracts the access token from request cookies or Authorization header
     */
    public static String extractAccessToken(ServerHttpRequest request) {
        try {
            // First try Authorization header
            String authHeader = request.getHeaders().getFirst("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                log.debug("Using access token from Authorization header");
                return authHeader.substring(7);
            }

            // Then try cookie
            List<HttpCookie> cookies = request.getCookies().get("accessToken");
            if (cookies != null && !cookies.isEmpty()) {
                String token = cookies.get(0).getValue();
                if (token != null && !token.isEmpty()) {
                    log.debug("Found access token in cookie: {}...",
                            token.length() > 10 ? token.substring(0, 10) + "..." : token);
                    return token;
                }
            }

            return null;
        } catch (Exception e) {
            log.error("Error extracting access token: {}", e.getMessage());
            return null;
        }
    }
}