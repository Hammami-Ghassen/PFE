package com.sante.app.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpEmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    public void sendOtp(String targetEmail, String matPers, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (fromAddress != null && !fromAddress.isBlank()) {
            message.setFrom(fromAddress);
        }
        message.setTo(targetEmail);
        message.setSubject("Votre code OTP");
        message.setText("""
                Bonjour,

                Votre code de verification est : %s

                Ce code est temporaire. Ne le partagez avec personne.
                """.formatted(otp));

        mailSender.send(message);
        log.info("OTP email sent to {} for MAT_PERS {}", maskEmail(targetEmail), matPers);
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
