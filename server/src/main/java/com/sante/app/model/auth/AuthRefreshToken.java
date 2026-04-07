package com.sante.app.model.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "\"AUTH_REFRESH_TOKEN\"")
@Getter
@Setter
public class AuthRefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ID\"")
    private Long id;

    @Column(name = "\"TOKEN_HASH\"", nullable = false, unique = true, length = 128)
    private String tokenHash;

    @Column(name = "\"MAT_PERS\"", nullable = false, length = 64)
    private String matPers;

    @Column(name = "\"EXPIRES_AT\"", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "\"REVOKED\"", nullable = false)
    private Boolean revoked = Boolean.FALSE;

    @Column(name = "\"REVOKED_AT\"")
    private LocalDateTime revokedAt;

    @CreationTimestamp
    @Column(name = "\"CREATED_AT\"", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
