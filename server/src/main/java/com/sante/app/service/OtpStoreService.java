package com.sante.app.service;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OtpStoreService {

    private static final int OTP_TTL_SECONDS = 300;
    private static final int OTP_REQUEST_WINDOW_SECONDS = 60;
    private static final int MAX_OTP_REQUESTS_PER_WINDOW = 3;

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

    public void incrementFailedAttempts(String matPers) {
        String key = "otp_attempts:" + matPers;
        redisTemplate.opsForValue().increment(key);
        if (redisTemplate.getExpire(key) == null || redisTemplate.getExpire(key) < 0) {
            redisTemplate.expire(key, Duration.ofMinutes(15));
        }
    }

    public int getFailedAttempts(String matPers) {
        String val = redisTemplate.opsForValue().get("otp_attempts:" + matPers);
        return val == null ? 0 : Integer.parseInt(val);
    }

    public void clearFailedAttempts(String matPers) {
        redisTemplate.delete("otp_attempts:" + matPers);
    }

    public boolean isBlocked(String matPers) {
        return getFailedAttempts(matPers) >= 3;
    }

    public boolean isOtpRequestAllowed(String matPers) {
        String key = "otp_request_limit:" + matPers;
        Long requestCount = redisTemplate.opsForValue().increment(key);
        if (requestCount != null && requestCount == 1L) {
            redisTemplate.expire(key, Duration.ofSeconds(OTP_REQUEST_WINDOW_SECONDS));
        }
        return requestCount != null && requestCount <= MAX_OTP_REQUESTS_PER_WINDOW;
    }
}
