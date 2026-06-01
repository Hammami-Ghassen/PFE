package com.sante.app.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.sante.app.model.notification.AppNotification;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<AppNotification, Long> {
    List<AppNotification> findByMatPersOrderByCreatedAtDesc(String matPers);
    long countByMatPersAndIsReadFalse(String matPers);
}
