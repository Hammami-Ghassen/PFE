package com.sante.app.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OtpMailSettingsSchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS "OTP_MAIL_SETTINGS" (
                    "ID" BIGINT PRIMARY KEY,
                    "HOST" VARCHAR(255) NOT NULL,
                    "PORT" INTEGER NOT NULL,
                    "USERNAME" VARCHAR(255),
                    "PASSWORD_ENCRYPTED" VARCHAR(2048),
                    "SMTP_AUTH" BOOLEAN NOT NULL DEFAULT TRUE,
                    "SECURITY_MODE" VARCHAR(20) NOT NULL DEFAULT 'STARTTLS',
                    "STARTTLS_ENABLE" BOOLEAN NOT NULL DEFAULT TRUE,
                    "FROM_ADDRESS" VARCHAR(255),
                    "CREATED_AT" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "UPDATED_AT" TIMESTAMP
                )
                """);
        jdbcTemplate.execute("""
                ALTER TABLE "OTP_MAIL_SETTINGS"
                ADD COLUMN IF NOT EXISTS "SECURITY_MODE" VARCHAR(20) NOT NULL DEFAULT 'STARTTLS'
                """);
        log.info("OTP mail settings schema is ready.");
    }
}
