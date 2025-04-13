package com.studysolution.studysync.repository;

import com.studysolution.studysync.models.User;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Mono;

public interface UserRepository extends ReactiveCrudRepository<User, String> {
    Mono<User> findByUsername(String username);

    Mono<User> findByRefreshToken(String refreshToken);

    Mono<User> findByEmail(String email);

    Mono<User> findByOAuthProviderAndOAuthProviderId(String provider, String providerId);
}
