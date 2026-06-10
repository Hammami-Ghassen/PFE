package com.sante.app.repository;

import com.sante.app.model.auth.OtpMailSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OtpMailSettingsRepository extends JpaRepository<OtpMailSettings, Long> {
}
