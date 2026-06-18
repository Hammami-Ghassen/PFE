package com.sante.app.model.chat;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "\"CHAT_ATTACHMENTS\"")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ID\"")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"MESSAGE_ID\"")
    private ChatMessage message;

    @Column(name = "\"FILE_NAME\"", nullable = false)
    private String fileName;

    @Column(name = "\"FILE_TYPE\"", nullable = false)
    private String fileType;
    
    @Column(name = "\"FILE_SIZE\"")
    private Long fileSize;

    @Basic(fetch = FetchType.LAZY)
    @Column(name = "\"CONTENT\"", nullable = false)
    private byte[] content;
}
