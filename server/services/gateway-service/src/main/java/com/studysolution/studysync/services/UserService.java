package com.studysolution.studysync.services;

import com.studysolution.studysync.models.User;
import com.studysolution.studysync.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    public Mono<User> findByUsername(String username) {
        if (username == null || username.trim().isEmpty()) {
            return Mono.error(new IllegalArgumentException("Username cannot be null or empty"));
        }

        return userRepository.findByUsername(username)
                .switchIfEmpty(Mono.error(new UsernameNotFoundException("User not found with username: " + username)));
    }
}
