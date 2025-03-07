package com.studysolution.studysync.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;

import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {
    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration config = new CorsConfiguration();
        // Specify the allowed origin (the address of your frontend)
        config.setAllowedOrigins(List.of("http://localhost:3000"));

        // Allowed methods
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));

        // Allowed headers
        config.setAllowedHeaders(List.of("Content-Type", "Authorization"));

        // MUST be true if you want to include cookies or credentials
        config.setAllowCredentials(true);

        // Create the source and register your CORS configuration
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsWebFilter(source);
    }
}
