package com.sante.app.repository.chat;

import com.sante.app.model.chat.ChatAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatAttachmentRepository extends JpaRepository<ChatAttachment, Long> {
}
