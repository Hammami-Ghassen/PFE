package com.sante.app.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
class OtpStoreServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private OtpStoreService otpStoreService;

    @BeforeEach
    void setUp() {
        otpStoreService = new OtpStoreService(redisTemplate);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void isOtpRequestAllowed_allowsThreeRequestsThenRejectsWithinWindow() {
        String key = "otp_request_limit:00091651";
        when(valueOperations.increment(key)).thenReturn(1L, 2L, 3L, 4L);

        assertTrue(otpStoreService.isOtpRequestAllowed("00091651"));
        assertTrue(otpStoreService.isOtpRequestAllowed("00091651"));
        assertTrue(otpStoreService.isOtpRequestAllowed("00091651"));
        assertFalse(otpStoreService.isOtpRequestAllowed("00091651"));

        verify(redisTemplate, times(1)).expire(key, Duration.ofSeconds(60));
    }
}
