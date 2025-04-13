package com.studysolution.studysync.services;

import com.studysolution.studysync.models.User;
import com.studysolution.studysync.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class OAuth2UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public Mono<User> processOAuthUser(String registrationId, OAuth2User oAuth2User) {
        log.debug("Processing OAuth2 user for provider: {}", registrationId);

        // Extract user details based on provider
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String email = extractEmail(registrationId, attributes);
        String username = extractUsername(registrationId, attributes);
        String name = extractName(registrationId, attributes);
        String providerId = extractProviderId(registrationId, attributes);

        if (email == null || email.isEmpty()) {
            log.error("Email not found for OAuth2 user from provider: {}", registrationId);
            return Mono.error(new RuntimeException("Email not available from OAuth provider"));
        }

        // First try to find user by email
        return userRepository.findByEmail(email)
                .flatMap(existingUser -> {
                    // User exists, update OAuth provider info if necessary
                    log.debug("Found existing user by email: {}", email);

                    // You may want to update user attributes here
                    existingUser.setOAuthProvider(registrationId);
                    existingUser.setOAuthProviderId(providerId);

                    return userRepository.save(existingUser);
                })
                .switchIfEmpty(
                        // User not found, create new one
                        createNewOAuthUser(email, username, name, registrationId, providerId)
                );
    }

    private Mono<User> createNewOAuthUser(String email, String username, String name,
                                          String registrationId, String providerId) {
        log.debug("Creating new user from OAuth2 login: {}, provider: {}", email, registrationId);

        // Generate random password for OAuth users (they'll use OAuth to login)
        String randomPassword = UUID.randomUUID().toString();
        String encodedPassword = passwordEncoder.encode(randomPassword);

        // Create new user
        User newUser = User.builder()
                .email(email)
                .username(username)
                .password(encodedPassword)
                .roles(Collections.singletonList("ROLE_USER"))
                .oAuthProvider(registrationId)
                .oAuthProviderId(providerId)
                .enabled(true)
                .build();

        return userRepository.save(newUser);
    }

    private String extractEmail(String registrationId, Map<String, Object> attributes) {
        switch (registrationId) {
            case "github":
                String email = (String) attributes.get("email");
                if (email == null) {
                    // FIX: GitHub might not return the email if it is not public.
                    // Consider implementing an additional API call to "https://api.github.com/user/emails"
                    // to retrieve the primary email, or provide a fallback mechanism.
                    log.warn("GitHub email is null. Additional email retrieval logic is required.");
                }
                return email;
            case "google":
                return (String) attributes.get("email");
            case "facebook":
                return (String) attributes.get("email");
            case "apple":
                return (String) attributes.get("email");
            default:
                return null;
        }
    }

    private String extractUsername(String registrationId, Map<String, Object> attributes) {
        switch (registrationId) {
            case "github":
                return (String) attributes.get("login");
            case "google":
                // For Google, create username from email
                String email = (String) attributes.get("email");
                return email != null ? email.split("@")[0] : "google_user_" + UUID.randomUUID().toString().substring(0, 8);
            case "facebook":
                return "fb_user_" + attributes.get("id");
            case "apple":
                // Apple doesn't provide consistent username, use sub + random string
                String sub = (String) attributes.get("sub");
                return sub != null ? "apple_user_" + sub.substring(0, Math.min(8, sub.length())) :
                        "apple_user_" + UUID.randomUUID().toString().substring(0, 8);
            default:
                return "user_" + UUID.randomUUID().toString().substring(0, 8);
        }
    }

    private String extractName(String registrationId, Map<String, Object> attributes) {
        switch (registrationId) {
            case "github":
                return (String) attributes.get("name");
            case "google":
                return (String) attributes.get("name");
            case "facebook":
                return (String) attributes.get("name");
            case "apple":
                // Apple might not provide name initially
                return attributes.containsKey("name") ? (String) attributes.get("name") : "Apple User";
            default:
                return null;
        }
    }

    private String extractProviderId(String registrationId, Map<String, Object> attributes) {
        switch (registrationId) {
            case "github":
                Object id = attributes.get("id");
                return id != null ? id.toString() : null;
            case "google":
                return (String) attributes.get("sub");
            case "facebook":
                return (String) attributes.get("id");
            case "apple":
                return (String) attributes.get("sub");
            default:
                return null;
        }
    }
}