package com.studysolution.studysync.config;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Custom implementation of OAuth2User to support manual creation
 * of OAuth2User objects from attribute maps
 */
public class CustomOAuth2User implements OAuth2User {

    private final Map<String, Object> attributes;
    private final Collection<? extends GrantedAuthority> authorities;
    private final String nameAttributeKey;

    public CustomOAuth2User(Map<String, Object> attributes) {
        this(attributes, Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")), "sub");
    }

    public CustomOAuth2User(Map<String, Object> attributes,
                            Collection<? extends GrantedAuthority> authorities,
                            String nameAttributeKey) {
        this.attributes = attributes != null ? new HashMap<>(attributes) : new HashMap<>();
        this.authorities = authorities;
        this.nameAttributeKey = nameAttributeKey;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getName() {
        // Return the name attribute if present, otherwise return a default value
        Object nameValue = attributes.get(nameAttributeKey);
        if (nameValue != null) {
            return nameValue.toString();
        }

        // Fallback to other common identifiers
        for (String key : new String[]{"id", "email", "login"}) {
            Object value = attributes.get(key);
            if (value != null) {
                return value.toString();
            }
        }

        return "unknown";
    }
}