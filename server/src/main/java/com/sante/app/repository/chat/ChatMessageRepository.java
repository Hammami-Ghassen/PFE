package com.sante.app.repository.chat;

import com.sante.app.model.chat.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    @Query("SELECT m FROM ChatMessage m WHERE (m.sender.matPers = :user1 AND m.recipient.matPers = :user2) OR (m.sender.matPers = :user2 AND m.recipient.matPers = :user1) ORDER BY m.timestamp ASC")
    List<ChatMessage> findChatHistory(@Param("user1") String user1, @Param("user2") String user2);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.recipient.matPers = :recipientId AND m.isRead = false AND m.sender.matPers = :senderId")
    int countUnreadMessages(@Param("recipientId") String recipientId, @Param("senderId") String senderId);
    
    @Query("SELECT m FROM ChatMessage m WHERE (m.sender.matPers = :user1 AND m.recipient.matPers = :user2) OR (m.sender.matPers = :user2 AND m.recipient.matPers = :user1) ORDER BY m.timestamp DESC LIMIT 1")
    ChatMessage findLastMessage(@Param("user1") String user1, @Param("user2") String user2);

    @Query("SELECT m FROM ChatMessage m WHERE m.roomId = :roomId ORDER BY m.timestamp ASC")
    List<ChatMessage> findChatHistoryByRoomId(@Param("roomId") String roomId);

    @Query("SELECT m FROM ChatMessage m WHERE m.roomId = :roomId ORDER BY m.timestamp DESC LIMIT 1")
    ChatMessage findLastMessageByRoomId(@Param("roomId") String roomId);

    // Get a list of individuals who have previously messaged this user or whom this user messaged
    @Query("SELECT DISTINCT m.sender.matPers FROM ChatMessage m WHERE m.recipient.matPers = :userId")
    List<String> findSendersToUser(@Param("userId") String userId);

    @Query("SELECT DISTINCT m.recipient.matPers FROM ChatMessage m WHERE m.sender.matPers = :userId AND m.recipient IS NOT NULL")
    List<String> findRecipientsFromUser(@Param("userId") String userId);
}
