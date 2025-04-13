package com.studysolution.studysync.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.naming.AuthenticationException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public Mono<ResponseEntity<Map<String, Object>>> handleGlobalException(Exception ex, ServerWebExchange exchange) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        errorResponse.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        errorResponse.put("error", HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase());
        errorResponse.put("message", ex.getMessage());
        errorResponse.put("path", exchange.getRequest().getPath().toString());

        return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse));
    }

    @ExceptionHandler(RuntimeException.class)
    public Mono<ResponseEntity<Map<String, Object>>> handleRuntimeException(RuntimeException ex, ServerWebExchange exchange) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        errorResponse.put("status", HttpStatus.BAD_REQUEST.value());
        errorResponse.put("error", HttpStatus.BAD_REQUEST.getReasonPhrase());
        errorResponse.put("message", ex.getMessage());
        errorResponse.put("path", exchange.getRequest().getPath().toString());

        return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse));
    }

    @ExceptionHandler(AuthenticationException.class)
    public Mono<ResponseEntity<Map<String, Object>>> handleAuthenticationException(
            AuthenticationException ex, ServerWebExchange exchange) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        errorResponse.put("status", HttpStatus.UNAUTHORIZED.value());
        errorResponse.put("error", HttpStatus.UNAUTHORIZED.getReasonPhrase());
        errorResponse.put("message", ex.getMessage());
        errorResponse.put("path", exchange.getRequest().getPath().toString());

        return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse));
    }
}