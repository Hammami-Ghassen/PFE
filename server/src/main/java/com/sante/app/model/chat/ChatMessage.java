package com.sante.app.model.chat;

import com.sante.app.model.legacy.Personnel;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "\"CHAT_MESSAGES\"")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ID\"")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"SENDER_ID\"", nullable = false)
    private Personnel sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"RECIPIENT_ID\"")
    private Personnel recipient;

    @Column(name = "\"ROOM_ID\"")
    private String roomId;

    @Column(name = "\"CONTENT\"", columnDefinition = "TEXT")
    private String content;

    @Column(name = "\"TIMESTAMP\"", nullable = false)
    private LocalDateTime timestamp;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"TYPE\"", nullable = false)
    private MessageType type;

    @Column(name = "\"IS_READ\"", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @OneToOne(mappedBy = "message", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private ChatAttachment attachment;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }

    public enum MessageType {
        TEXT,
        FILE
    }
}
