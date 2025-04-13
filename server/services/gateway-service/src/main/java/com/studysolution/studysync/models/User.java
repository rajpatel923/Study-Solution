package com.studysolution.studysync.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.lang.annotation.Annotation;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("users")
public class User{
    @Id
    private Long id;

    private String username;
    private String password;
    private String email;
    private List<String> roles;
    private boolean enabled;

    // OAuth2 related fields
    @Column("o_auth_provider")
    private String oAuthProvider;      // github, google, facebook, apple

    @Column("o_auth_provider_id")
    private String oAuthProviderId;    // user ID in the provider's system

    @Column("refresh_token")
    private String refreshToken;

    @Column("refresh_token_expiry_date")
    private LocalDateTime refreshTokenExpiryDate;


}
