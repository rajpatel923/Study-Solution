package com.studysolution.studysync.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
public class RouteConfig {
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("user-profile-service", r -> r
                        .path("/user-profile-service/**")
                        // Remove the "/user-profile-service" prefix so the microservice gets the remaining path
                        .filters(f -> f.rewritePath("/user-profile-service/(?<segment>.*)", "/${segment}"))
                        .uri("lb://user-profile-service"))
                .route("document-uploader-service", r -> r
                        .path("/documentservice/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://document-uploader-service"))
                .route("ai-service", r -> r
                        .path("/aiservice/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://AI-SERVICE"))
                .build();
    }
}