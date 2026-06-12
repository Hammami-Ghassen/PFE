package com.sante.app.service;

import com.sante.app.dto.request.OtpMailTestRequest;
import com.sante.app.model.auth.OtpMailSecurityMode;
import java.util.Properties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpEmailService {

    private final OtpMailSettingsService settingsService;

    public void sendOtp(String targetEmail, String matPers, String otp) {
        OtpMailSettingsService.ActiveOtpMailSettings settings = settingsService.getActiveSettings();
        JavaMailSender mailSender = buildMailSender(settings);
        SimpleMailMessage message = buildMessage(settings, targetEmail, "Votre code OTP", """
                Bonjour,

                Votre code de verification est : %s

                Ce code est temporaire. Ne le partagez avec personne.
                """.formatted(otp));

        mailSender.send(message);
        log.info("OTP email sent to {} for MAT_PERS {}", maskEmail(targetEmail), matPers);
    }

    public void sendTestEmail(String targetEmail) {
        OtpMailSettingsService.ActiveOtpMailSettings settings = settingsService.getActiveSettings();
        sendTestEmail(settings, targetEmail);
    }

    public void sendTestEmail(OtpMailTestRequest request) {
        OtpMailSettingsService.ActiveOtpMailSettings settings = new OtpMailSettingsService.ActiveOtpMailSettings(
                request.host().trim(),
                request.port(),
                trimToNull(request.username()),
                trimToNull(request.password()),
                Boolean.TRUE.equals(request.smtpAuth()),
                request.securityMode(),
                trimToNull(request.fromAddress()));
        sendTestEmail(settings, request.targetEmail());
    }

    private void sendTestEmail(OtpMailSettingsService.ActiveOtpMailSettings settings, String targetEmail) {
        JavaMailSender mailSender = buildMailSender(settings);
        SimpleMailMessage message = buildMessage(settings, targetEmail, "Test configuration SMTP OTP", """
                Bonjour,

                Ceci est un email de test envoye avec la configuration SMTP OTP active.
                """);

        try {
            mailSender.send(message);
            log.info("OTP SMTP test email sent to {}", maskEmail(targetEmail));
        } catch (MailException ex) {
            log.warn("OTP SMTP test email failed for {}: {}", maskEmail(targetEmail), ex.getMessage());
            throw ex;
        }
    }

    protected JavaMailSender buildMailSender(OtpMailSettingsService.ActiveOtpMailSettings settings) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(settings.host());
        sender.setPort(settings.port());
        if (settings.username() != null && !settings.username().isBlank()) {
            sender.setUsername(settings.username());
        }
        if (settings.password() != null && !settings.password().isBlank()) {
            sender.setPassword(settings.password());
        }
        Properties properties = sender.getJavaMailProperties();
        properties.put("mail.transport.protocol", "smtp");
        properties.put("mail.smtp.auth", Boolean.toString(settings.smtpAuth()));
        properties.put("mail.smtp.connectiontimeout", "100000");
        properties.put("mail.smtp.timeout", "100000");
        properties.put("mail.smtp.writetimeout", "100000");
        applySecurityMode(properties, settings.securityMode(), settings.host());
        return sender;
    }

    private void applySecurityMode(Properties properties, OtpMailSecurityMode securityMode, String host) {
        switch (securityMode == null ? OtpMailSecurityMode.NONE : securityMode) {
            case SSL_TLS -> {
                properties.put("mail.smtp.ssl.enable", "true");
                properties.put("mail.smtp.ssl.trust", host);
                properties.put("mail.smtp.starttls.enable", "false");
                properties.put("mail.smtp.starttls.required", "false");
            }
            case STARTTLS -> {
                properties.put("mail.smtp.ssl.enable", "false");
                properties.put("mail.smtp.starttls.enable", "true");
                properties.put("mail.smtp.starttls.required", "true");
            }
            case NONE -> {
                properties.put("mail.smtp.ssl.enable", "false");
                properties.put("mail.smtp.starttls.enable", "false");
                properties.put("mail.smtp.starttls.required", "false");
            }
        }
    }

    SimpleMailMessage buildMessage(
            OtpMailSettingsService.ActiveOtpMailSettings settings,
            String targetEmail,
            String subject,
            String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        String fromAddress = settings.fromAddress() != null ? settings.fromAddress() : settings.username();
        if (fromAddress != null && !fromAddress.isBlank()) {
            message.setFrom(fromAddress);
        }
        message.setTo(targetEmail);
        message.setSubject(subject);
        message.setText(body);
        return message;
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String maskEmail(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) {
            return "****";
        }
        String domain = email.substring(atIndex);
        return email.charAt(0) + "****" + domain;
    }
}
