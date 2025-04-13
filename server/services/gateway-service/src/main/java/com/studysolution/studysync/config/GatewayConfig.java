package com.studysolution.studysync.config;

import com.studysolution.studysync.filter.GatewayUserIdFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;

/**
 * Configuration for Spring Cloud Gateway filters and behaviors
 */
@Configuration
public class GatewayConfig {

    /**
     * Register the user ID propagation filter at a high priority
     */
    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE + 10)
    public GatewayUserIdFilter userIdPropagationFilter(GatewayUserIdFilter filter) {
        return filter;
    }
}