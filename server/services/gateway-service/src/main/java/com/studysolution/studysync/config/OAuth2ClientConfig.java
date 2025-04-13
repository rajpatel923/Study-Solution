package com.studysolution.studysync.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.InMemoryReactiveClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.ReactiveClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.server.ServerOAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.web.server.WebSessionServerOAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.IdTokenClaimNames;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class OAuth2ClientConfig {

    @Value("${spring.security.oauth2.client.registration.github.client-id}")
    private String githubClientId;

    @Value("${spring.security.oauth2.client.registration.github.client-secret}")
    private String githubClientSecret;

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String googleClientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret}")
    private String googleClientSecret;

    @Value("${spring.security.oauth2.client.registration.facebook.client-id}")
    private String facebookClientId;

    @Value("${spring.security.oauth2.client.registration.facebook.client-secret}")
    private String facebookClientSecret;

    @Value("${spring.security.oauth2.client.registration.apple.client-id}")
    private String appleClientId;

    @Value("${spring.security.oauth2.client.registration.apple.client-secret}")
    private String appleClientSecret;

    @Value("${app.oauth2.redirect-uri}")
    private String redirectUri;

    @Bean
    public ReactiveClientRegistrationRepository clientRegistrationRepository() {
        List<ClientRegistration> registrations = new ArrayList<>();

        // GitHub Registration
        registrations.add(ClientRegistration.withRegistrationId("github")
                .clientId(githubClientId)
                .clientSecret(githubClientSecret)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(redirectUri)
                .scope("user:email", "read:user")
                .authorizationUri("https://github.com/login/oauth/authorize")
                .tokenUri("https://github.com/login/oauth/access_token")
                .userInfoUri("https://api.github.com/user")
                .userNameAttributeName("login")
                .clientName("GitHub")
                .build());

        // Google Registration
        registrations.add(ClientRegistration.withRegistrationId("google")
                .clientId(googleClientId)
                .clientSecret(googleClientSecret)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(redirectUri)
                .scope("openid", "profile", "email")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://www.googleapis.com/oauth2/v4/token")
                .userInfoUri("https://www.googleapis.com/oauth2/v3/userinfo")
                .userNameAttributeName(IdTokenClaimNames.SUB)
                .clientName("Google")
                .build());

        // Facebook Registration
        registrations.add(ClientRegistration.withRegistrationId("facebook")
                .clientId(facebookClientId)
                .clientSecret(facebookClientSecret)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(redirectUri)
                .scope("email", "public_profile")
                .authorizationUri("https://www.facebook.com/v17.0/dialog/oauth") // Updated to v17.0
                .tokenUri("https://graph.facebook.com/v17.0/oauth/access_token")
                .userInfoUri("https://graph.facebook.com/v17.0/me?fields=id,name,email,picture")
                .userNameAttributeName("id")
                .clientName("Facebook")
                .build());

        // Apple Registration
        registrations.add(ClientRegistration.withRegistrationId("apple")
                .clientId(appleClientId)
                .clientSecret(appleClientSecret) // Note: This will be dynamically generated
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/api/v1/auth/apple/callback") // Special redirect for Apple
                .scope("name", "email")
                .authorizationUri("https://appleid.apple.com/auth/authorize")
                .tokenUri("https://appleid.apple.com/auth/token")
                .userInfoUri("https://appleid.apple.com/auth/authorize") // Dummy, we parse ID token instead
                .userNameAttributeName("sub")
                .clientName("Apple")
                .build());

        return new InMemoryReactiveClientRegistrationRepository(registrations);
    }

    @Bean
    public ServerOAuth2AuthorizedClientRepository authorizedClientRepository() {
        return new WebSessionServerOAuth2AuthorizedClientRepository();
    }
}
