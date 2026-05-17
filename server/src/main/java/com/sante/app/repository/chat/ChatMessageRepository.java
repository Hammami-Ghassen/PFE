package com.sante.app.repository.chat;

import com.sante.app.model.chat.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    @Query("SELECT m FROM ChatMessage m LEFT JOIN FETCH m.sender LEFT JOIN FETCH m.recipient LEFT JOIN FETCH m.attachment WHERE (m.sender.matPers = :user1 AND m.recipient.matPers = :user2) OR (m.sender.matPers = :user2 AND m.recipient.matPers = :user1) ORDER BY m.timestamp ASC")
    List<ChatMessage> findChatHistory(@Param("user1") String user1, @Param("user2") String user2);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.recipient.matPers = :recipientId AND m.isRead = false AND m.sender.matPers = :senderId")
    int countUnreadMessages(@Param("recipientId") String recipientId, @Param("senderId") String senderId);
    
    @Query("SELECT m FROM ChatMessage m LEFT JOIN FETCH m.sender LEFT JOIN FETCH m.recipient LEFT JOIN FETCH m.attachment WHERE (m.sender.matPers = :user1 AND m.recipient.matPers = :user2) OR (m.sender.matPers = :user2 AND m.recipient.matPers = :user1) ORDER BY m.timestamp DESC LIMIT 1")
    ChatMessage findLastMessage(@Param("user1") String user1, @Param("user2") String user2);

    @Query("SELECT m FROM ChatMessage m LEFT JOIN FETCH m.sender LEFT JOIN FETCH m.attachment WHERE m.roomId = :roomId ORDER BY m.timestamp ASC")
    List<ChatMessage> findChatHistoryByRoomId(@Param("roomId") String roomId);

    @Query("SELECT m FROM ChatMessage m LEFT JOIN FETCH m.sender LEFT JOIN FETCH m.attachment WHERE m.roomId = :roomId ORDER BY m.timestamp DESC LIMIT 1")
    ChatMessage findLastMessageByRoomId(@Param("roomId") String roomId);

    // Get a list of individuals who have previously messaged this user or whom this user messaged
    @Query("SELECT DISTINCT m.sender.matPers FROM ChatMessage m WHERE m.recipient.matPers = :userId")
    List<String> findSendersToUser(@Param("userId") String userId);

    @Query("SELECT DISTINCT m.recipient.matPers FROM ChatMessage m WHERE m.sender.matPers = :userId AND m.recipient IS NOT NULL")
    List<String> findRecipientsFromUser(@Param("userId") String userId);

    @Query("SELECT m.sender.matPers, COUNT(m) FROM ChatMessage m WHERE m.recipient.matPers = :recipientId AND m.isRead = false GROUP BY m.sender.matPers")
    List<Object[]> countUnreadMessagesGroupedBySender(@Param("recipientId") String recipientId);

    @Query("SELECT m FROM ChatMessage m LEFT JOIN FETCH m.sender LEFT JOIN FETCH m.recipient LEFT JOIN FETCH m.attachment WHERE m.id IN (SELECT MAX(m2.id) FROM ChatMessage m2 WHERE (m2.sender.matPers = :userId AND m2.recipient IS NOT NULL) OR (m2.recipient.matPers = :userId) GROUP BY CASE WHEN m2.sender.matPers = :userId THEN m2.recipient.matPers ELSE m2.sender.matPers END)")
    List<ChatMessage> findLastMessagesForUser(@Param("userId") String userId);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.sender.matPers = :senderId AND m.recipient.matPers = :recipientId AND m.isRead = false")
    int markAllAsRead(@Param("senderId") String senderId, @Param("recipientId") String recipientId);
}
