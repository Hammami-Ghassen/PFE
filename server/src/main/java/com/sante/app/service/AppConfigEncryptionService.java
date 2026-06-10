package com.sante.app.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AppConfigEncryptionService {

    private static final String CIPHER = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128;
    private static final int IV_BYTES = 12;

    private final SecureRandom secureRandom = new SecureRandom();
    private final byte[] key;

    public AppConfigEncryptionService(@Value("${app.config-encryption-key:}") String configuredKey) {
        this.key = parseKey(configuredKey);
    }

    public String encrypt(String plainText) {
        if (plainText == null || plainText.isBlank()) {
            return null;
        }
        requireKey();
        try {
            byte[] iv = new byte[IV_BYTES];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(CIPHER);
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length + encrypted.length)
                    .put(iv)
                    .put(encrypted)
                    .array());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Impossible de chiffrer la configuration SMTP.", e);
        }
    }

    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isBlank()) {
            return null;
        }
        requireKey();
        try {
            byte[] payload = Base64.getDecoder().decode(encryptedText);
            byte[] iv = Arrays.copyOfRange(payload, 0, IV_BYTES);
            byte[] encrypted = Arrays.copyOfRange(payload, IV_BYTES, payload.length);
            Cipher cipher = Cipher.getInstance(CIPHER);
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(GCM_TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException | GeneralSecurityException e) {
            throw new IllegalStateException("Impossible de dechiffrer la configuration SMTP.", e);
        }
    }

    private void requireKey() {
        if (key.length == 0) {
            throw new IllegalStateException("APP_CONFIG_ENCRYPTION_KEY est requis pour stocker le mot de passe SMTP.");
        }
    }

    private byte[] parseKey(String configuredKey) {
        if (configuredKey == null || configuredKey.isBlank()) {
            return new byte[0];
        }
        String trimmed = configuredKey.trim();
        try {
            byte[] decoded = Base64.getDecoder().decode(trimmed);
            if (isValidAesKey(decoded)) {
                return decoded;
            }
        } catch (IllegalArgumentException ignored) {
            // Fall back to raw UTF-8 bytes for local development keys.
        }
        byte[] raw = trimmed.getBytes(StandardCharsets.UTF_8);
        if (!isValidAesKey(raw)) {
            throw new IllegalStateException("APP_CONFIG_ENCRYPTION_KEY doit contenir 16, 24 ou 32 octets.");
        }
        return raw;
    }

    private boolean isValidAesKey(byte[] candidate) {
        return candidate.length == 16 || candidate.length == 24 || candidate.length == 32;
    }
}
