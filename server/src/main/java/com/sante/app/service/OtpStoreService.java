package com.sante.app.service;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OtpStoreService {

    private static final int OTP_TTL_SECONDS = 300;

    private final StringRedisTemplate redisTemplate;

    // Centralizes Redis OTP key/TTL behavior so auth flow remains orchestration-focused.
    public void storeOtpHash(String matPers, String otpHash) {
        redisTemplate.opsForValue().set(redisKey(matPers), otpHash, Duration.ofSeconds(OTP_TTL_SECONDS));
    }

    public String findOtpHash(String matPers) {
        return redisTemplate.opsForValue().get(redisKey(matPers));
    }

    public void deleteOtp(String matPers) {
        redisTemplate.delete(redisKey(matPers));
    }

    private String redisKey(String matPers) {
        return "otp:" + matPers;
    }
}
