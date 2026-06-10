package com.sante.app.model.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "\"OTP_MAIL_SETTINGS\"")
@Getter
@Setter
public class OtpMailSettings {

    @Id
    @Column(name = "\"ID\"")
    private Long id;

    @Column(name = "\"HOST\"", nullable = false, length = 255)
    private String host;

    @Column(name = "\"PORT\"", nullable = false)
    private Integer port;

    @Column(name = "\"USERNAME\"", length = 255)
    private String username;

    @Column(name = "\"PASSWORD_ENCRYPTED\"", length = 2048)
    private String passwordEncrypted;

    @Column(name = "\"SMTP_AUTH\"", nullable = false)
    private Boolean smtpAuth = Boolean.TRUE;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"SECURITY_MODE\"", nullable = false, length = 20)
    private OtpMailSecurityMode securityMode = OtpMailSecurityMode.STARTTLS;

    @Column(name = "\"STARTTLS_ENABLE\"", nullable = false)
    private Boolean starttlsEnable = Boolean.TRUE;

    @Column(name = "\"FROM_ADDRESS\"", length = 255)
    private String fromAddress;

    @CreationTimestamp
    @Column(name = "\"CREATED_AT\"", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "\"UPDATED_AT\"")
    private LocalDateTime updatedAt;
}
