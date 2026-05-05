package com.sante.app.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "\"NOTIFICATIONS\"")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "\"MAT_PERS\"", nullable = false, length = 10)
    private String matPers;

    @Column(name = "\"MESSAGE\"", nullable = false, length = 500)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"TYPE\"", nullable = false)
    private NotificationType type;

    @Builder.Default
    @Column(name = "\"IS_READ\"", nullable = false)
    private Boolean isRead = false;

    @CreationTimestamp
    @Column(name = "\"CREATED_AT\"", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
