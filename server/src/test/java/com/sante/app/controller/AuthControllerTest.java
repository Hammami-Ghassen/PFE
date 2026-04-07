package com.sante.app.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sante.app.dto.request.OtpChannel;
import com.sante.app.dto.request.RequestOtpRequest;
import com.sante.app.dto.request.VerifyOtpRequest;
import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.AuthProfileResponse;
import com.sante.app.dto.response.AuthResponse;
import com.sante.app.exception.UnauthorizedException;
import com.sante.app.security.jwt.JwtProperties;
import com.sante.app.service.OtpAuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private OtpAuthService otpAuthService;

    @Mock
    private JwtProperties jwtProperties;

    @Mock
    private Authentication authentication;

    private AuthController controller;

    @BeforeEach
    void setUp() {
        controller = new AuthController(otpAuthService, jwtProperties);
    }

    @Test
    void requestOtp_returnsSuccessEnvelope() {
        RequestOtpRequest request = new RequestOtpRequest("00091651", OtpChannel.EMAIL);

        ResponseEntity<ApiResponse<Void>> response = controller.requestOtp(request);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(true, response.getBody().success());
        assertEquals("OTP envoyé avec succès.", response.getBody().message());
        verify(otpAuthService).requestOtp("00091651", OtpChannel.EMAIL);
    }

    @Test
    void verifyOtp_setsCookieAndReturnsAuthEnvelope() {
        when(jwtProperties.getRefreshCookieName()).thenReturn("refresh_token");
        when(jwtProperties.isRefreshCookieSecure()).thenReturn(false);
        when(jwtProperties.getRefreshCookieSameSite()).thenReturn("Strict");
        when(jwtProperties.getRefreshTokenExpiration()).thenReturn(604800000L);

        AuthResponse authResponse = new AuthResponse("access-token", null, "Bearer", 900L, "00091651", "EMPLOYEE");
        OtpAuthService.TokenSession session = new OtpAuthService.TokenSession(authResponse, "refresh-token-value");
        when(otpAuthService.verifyOtp(eq("00091651"), eq("123456"))).thenReturn(session);

        ResponseEntity<ApiResponse<AuthResponse>> response = controller.verifyOtp(new VerifyOtpRequest("00091651", "123456"));

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(true, response.getBody().success());
        assertEquals("access-token", response.getBody().data().accessToken());
        assertNotNull(response.getHeaders().getFirst(HttpHeaders.SET_COOKIE));
    }

    @Test
    void refresh_withoutToken_throwsUnauthorized() {
        assertThrows(UnauthorizedException.class, () -> controller.refresh(null));
        assertThrows(UnauthorizedException.class, () -> controller.refresh("   "));
    }

    @Test
    void me_returnsProfileInSuccessEnvelope() {
        when(authentication.getPrincipal()).thenReturn("00091651");
        AuthProfileResponse profile = new AuthProfileResponse(
                "00091651",
                "Ali",
                "Ben Salah",
                "Ali Ben Salah",
                "EMPLOYEE",
                "AGENT",
                "010",
                "Hopital Central",
                "ali@example.com",
                "20111222");
        when(otpAuthService.getProfile("00091651")).thenReturn(profile);

        ResponseEntity<ApiResponse<AuthProfileResponse>> response = controller.me(authentication);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(true, response.getBody().success());
        assertEquals("00091651", response.getBody().data().matPers());
        assertEquals("Ali Ben Salah", response.getBody().data().fullName());
    }
}
