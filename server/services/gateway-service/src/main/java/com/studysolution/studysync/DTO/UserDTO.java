package com.studysolution.studysync.DTO;

import com.studysolution.studysync.models.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import net.minidev.json.annotate.JsonIgnore;
import org.springframework.data.relational.core.mapping.Column;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {

    private Long id;

    private String username;

    private String email;
    private List<String> roles;
    private boolean enabled;

    // OAuth2 related fields
    @Column("o_auth_provider")
    private String oAuthProvider;      // github, google, facebook, apple

    @Column("o_auth_provider_id")
    private String oAuthProviderId;    // user ID in the provider's system

    public UserDTO(User byUsername) {
        id = byUsername.getId();
        username = byUsername.getUsername();
        email = byUsername.getEmail();
        roles = byUsername.getRoles();
        oAuthProvider = byUsername.getOAuthProvider();
        oAuthProviderId = byUsername.getOAuthProviderId();
        enabled = byUsername.isEnabled();

    }
}
