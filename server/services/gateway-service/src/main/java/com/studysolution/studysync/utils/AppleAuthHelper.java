package com.studysolution.studysync.utils;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bouncycastle.asn1.pkcs.PrivateKeyInfo;
import org.bouncycastle.openssl.PEMParser;
import org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.ResourceUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.io.FileReader;
import java.io.Reader;
import java.security.PrivateKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Helper for Apple Sign In authentication which requires special handling
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class AppleAuthHelper {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${spring.security.oauth2.client.registration.apple.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.registration.apple.team-id}")
    private String teamId;

    @Value("${spring.security.oauth2.client.registration.apple.key-id}")
    private String keyId;

    @Value("${spring.security.oauth2.client.registration.apple.key-path}")
    private String keyPath;

    private PrivateKey privateKey;

    /**
     * Generate a client secret for Apple Sign In
     */
    public String generateClientSecret() {
        try {
            if (privateKey == null) {
                loadPrivateKey();
            }

            Instant now = Instant.now();
            Instant expiration = now.plus(5, ChronoUnit.MINUTES);

            return Jwts.builder()
                    .setHeaderParam("alg", "ES256")
                    .setHeaderParam("kid", keyId)
                    .setIssuer(teamId)
                    .setIssuedAt(Date.from(now))
                    .setExpiration(Date.from(expiration))
                    .setAudience("https://appleid.apple.com")
                    .setSubject(clientId)
                    .signWith(privateKey)
                    .compact();
        } catch (Exception e) {
            log.error("Error generating Apple client secret", e);
            throw new RuntimeException("Failed to generate Apple client secret", e);
        }
    }

    /**
     * Load the private key from the file system
     */
    private void loadPrivateKey() {
        try {
            Reader reader = new FileReader(ResourceUtils.getFile(keyPath));
            PEMParser pemParser = new PEMParser(reader);
            PrivateKeyInfo privateKeyInfo = (PrivateKeyInfo) pemParser.readObject();
            pemParser.close();

            JcaPEMKeyConverter converter = new JcaPEMKeyConverter();
            privateKey = converter.getPrivateKey(privateKeyInfo);
        } catch (Exception e) {
            log.error("Error loading Apple private key", e);
            throw new RuntimeException("Failed to load Apple private key", e);
        }
    }

    /**
     * Exchange authorization code for tokens
     */
    public Mono<Map<String, Object>> exchangeAuthorizationCodeForTokens(String authorizationCode, String state) {
        String clientSecret = generateClientSecret();

        Map<String, String> formData = new HashMap<>();
        formData.put("client_id", clientId);
        formData.put("client_secret", clientSecret);
        formData.put("code", authorizationCode);
        formData.put("grant_type", "authorization_code");
        formData.put("redirect_uri", "{baseUrl}/api/v1/auth/apple/callback");

        WebClient client = webClientBuilder.build();

        return client
                .post()
                .uri("https://appleid.apple.com/auth/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .bodyValue(formData)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                })
                .doOnNext(response -> log.debug("Apple token response received: {}", response.keySet()))
                .onErrorResume(e -> {
                    log.error("Error exchanging Apple authorization code for tokens", e);
                    return Mono.error(new RuntimeException("Failed to exchange Apple authorization code"));
                });
    }

    /**
     * Parse id_token to extract user information
     */
    public Map<String, Object> parseIdToken(String idToken) {
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length < 2) {
                throw new RuntimeException("Invalid ID token format");
            }

            // We need to decode the payload (middle part of the JWT)
            String payload = parts[1];

            // Add padding if necessary
            while (payload.length() % 4 != 0) {
                payload += "=";
            }

            // Decode base64
            byte[] decodedBytes = java.util.Base64.getUrlDecoder().decode(payload);
            String decodedPayload = new String(decodedBytes);
            // Parse JSON
            return objectMapper.readValue(decodedPayload, Map.class);
        } catch (Exception e) {
            log.error("Error parsing Apple ID token", e);
            throw new RuntimeException("Failed to parse Apple ID token", e);
        }
    }
}