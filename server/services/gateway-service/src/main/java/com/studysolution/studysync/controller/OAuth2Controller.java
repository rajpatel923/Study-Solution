package com.studysolution.studysync.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.registration.ReactiveClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.server.DefaultServerOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.server.ServerOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth/oauth2")
@RequiredArgsConstructor
@Slf4j
public class OAuth2Controller {

    private final ReactiveClientRegistrationRepository clientRegistrationRepository;

    /**
     * Endpoint to initiate OAuth2 login with a specific provider
     */
    @GetMapping("/authorize/{provider}")
    public Mono<ResponseEntity<Object>> authorizeOAuth2Provider(
            @PathVariable("provider") String provider,
            @RequestParam(value = "redirectUri", required = false) String redirectUri,
            ServerWebExchange exchange) {

        log.debug("Requesting OAuth2 authorization for provider: {}", provider);

        // Check if the provider exists in your client registration repository
        return clientRegistrationRepository.findByRegistrationId(provider)
                .flatMap(registration -> {
                    ServerOAuth2AuthorizationRequestResolver resolver =
                            new DefaultServerOAuth2AuthorizationRequestResolver(
                                    clientRegistrationRepository);

                    return resolver.resolve(exchange, provider)
                            .map(OAuth2AuthorizationRequest::getAuthorizationRequestUri)
                            .map(uri -> {
                                log.debug("Redirecting to OAuth2 provider URL: {}", uri);
                                return ResponseEntity.status(HttpStatus.FOUND)
                                        .location(URI.create(uri))
                                        .build();
                            });
                })
                .switchIfEmpty(Mono.defer(() -> {
                    log.error("Provider '{}' not found in client registration repository", provider);
                    return Mono.just(ResponseEntity.badRequest()
                            .body(Map.of("error", "Provider not supported")));
                }));
    }

    /**
     * Get available OAuth2 providers
     */
    @GetMapping("/providers")
    public Mono<ResponseEntity<Map<String, Object>>> getAvailableProviders() {
        Map<String, Object> providers = new HashMap<>();

        // Basic endpoints
        Map<String, String> endpoints = new HashMap<>();
        endpoints.put("github", "/api/v1/auth/oauth2/authorize/github");
        endpoints.put("google", "/api/v1/auth/oauth2/authorize/google");
        endpoints.put("facebook", "/api/v1/auth/oauth2/authorize/facebook");
        endpoints.put("apple", "/api/v1/auth/oauth2/authorize/apple");

        providers.put("endpoints", endpoints);

        // Include metadata
        providers.put("supportedProviders", List.of("github", "google", "facebook", "apple"));
        providers.put("redirectPath", "/oauth2/callback");

        return Mono.just(ResponseEntity.ok(providers));
    }
}