package com.sante.app.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

import com.sante.app.model.auth.OtpMailSecurityMode;
import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;

class OtpEmailServiceTest {

    @Test
    void buildMailSender_usesActiveSettings() {
        OtpEmailService service = new OtpEmailService(mock(OtpMailSettingsService.class));
        OtpMailSettingsService.ActiveOtpMailSettings settings = activeSettings("otp@example.tn");

        JavaMailSenderImpl sender = (JavaMailSenderImpl) service.buildMailSender(settings);

        assertEquals("smtp.example.tn", sender.getHost());
        assertEquals(2525, sender.getPort());
        assertEquals("smtp-user", sender.getUsername());
        assertEquals("smtp-password", sender.getPassword());
        assertEquals("true", sender.getJavaMailProperties().getProperty("mail.smtp.auth"));
        assertEquals("true", sender.getJavaMailProperties().getProperty("mail.smtp.starttls.enable"));
        assertEquals("true", sender.getJavaMailProperties().getProperty("mail.smtp.starttls.required"));
        assertEquals("false", sender.getJavaMailProperties().getProperty("mail.smtp.ssl.enable"));
    }

    @Test
    void buildMailSender_configuresImplicitSslTls() {
        OtpEmailService service = new OtpEmailService(mock(OtpMailSettingsService.class));
        OtpMailSettingsService.ActiveOtpMailSettings settings = new OtpMailSettingsService.ActiveOtpMailSettings(
                "mail.private.tn",
                465,
                "smtp-user",
                "smtp-password",
                true,
                OtpMailSecurityMode.SSL_TLS,
                "otp@example.tn");

        JavaMailSenderImpl sender = (JavaMailSenderImpl) service.buildMailSender(settings);

        assertEquals("true", sender.getJavaMailProperties().getProperty("mail.smtp.ssl.enable"));
        assertEquals("mail.private.tn", sender.getJavaMailProperties().getProperty("mail.smtp.ssl.trust"));
        assertEquals("false", sender.getJavaMailProperties().getProperty("mail.smtp.starttls.enable"));
    }

    @Test
    void buildMessage_setsFromAddressFromConfiguredSender() {
        OtpEmailService service = new OtpEmailService(mock(OtpMailSettingsService.class));

        SimpleMailMessage message = service.buildMessage(
                activeSettings("otp@example.tn"),
                "agent@example.tn",
                "Sujet",
                "Message");

        assertEquals("otp@example.tn", message.getFrom());
        assertEquals("agent@example.tn", message.getTo()[0]);
        assertEquals("Sujet", message.getSubject());
        assertEquals("Message", message.getText());
    }

    private OtpMailSettingsService.ActiveOtpMailSettings activeSettings(String fromAddress) {
        return new OtpMailSettingsService.ActiveOtpMailSettings(
                "smtp.example.tn",
                2525,
                "smtp-user",
                "smtp-password",
                true,
                OtpMailSecurityMode.STARTTLS,
                fromAddress);
    }
}
