package com.studysolution.studysync.config;

import com.studysolution.studysync.filter.AuthenticationFilter;
import com.studysolution.studysync.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.authentication.HttpBasicServerAuthenticationEntryPoint;
import org.springframework.security.web.server.authentication.HttpStatusServerEntryPoint;
import org.springframework.security.web.server.authorization.HttpStatusServerAccessDeniedHandler;
import org.springframework.security.web.server.util.matcher.ServerWebExchangeMatcher;
import org.springframework.security.web.server.util.matcher.ServerWebExchangeMatchers;
import reactor.core.publisher.Mono;

import java.util.List;

@Configuration
@EnableWebFluxSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final JwtUtil jwtUtil;

    @Value("${auth.white-list-urls}")
    private List<String> whiteListUrls;

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http, AuthenticationFilter authenticationFilter) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .exceptionHandling(exceptionHandlingSpec -> exceptionHandlingSpec
                        .authenticationEntryPoint(new HttpStatusServerEntryPoint(HttpStatus.UNAUTHORIZED))
                        .accessDeniedHandler(new HttpStatusServerAccessDeniedHandler(HttpStatus.FORBIDDEN))
                )
                .authorizeExchange(exchange -> exchange
                        .matchers(ServerWebExchangeMatchers.pathMatchers(HttpMethod.OPTIONS, "/**")).permitAll()
                        .pathMatchers(whiteListUrls.toArray(new String[0])).permitAll()
                        .pathMatchers("/api/admin/**").hasRole("ADMIN")
                        .pathMatchers("/api/v1/auth/**").permitAll()
                        .anyExchange().authenticated()

                )
                .addFilterAt(authenticationFilter, SecurityWebFiltersOrder.AUTHENTICATION)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

}
