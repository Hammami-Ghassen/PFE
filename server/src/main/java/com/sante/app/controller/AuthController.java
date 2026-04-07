package com.sante.app.controller;

import com.sante.app.dto.request.RequestOtpRequest;
import com.sante.app.dto.request.VerifyOtpRequest;
import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.AuthProfileResponse;
import com.sante.app.dto.response.AuthResponse;
import com.sante.app.exception.UnauthorizedException;
import com.sante.app.security.jwt.JwtProperties;
import com.sante.app.service.OtpAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification", description = "Endpoints d'authentification")
public class AuthController {

    private final OtpAuthService otpAuthService;
    private final JwtProperties jwtProperties;

    @PostMapping("/request-otp")
    @Operation(summary = "Demander un OTP avec MAT_PERS")
    public ResponseEntity<ApiResponse<Void>> requestOtp(@Valid @RequestBody RequestOtpRequest request) {
        otpAuthService.requestOtp(request.matPers(), request.channel());
        return ResponseEntity.ok(ApiResponse.success("OTP envoyé avec succès.", null));
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Vérifier OTP et ouvrir une session")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        // Controller stays thin: request parsing + cookie headers while auth workflow lives in service layer.
        OtpAuthService.TokenSession session = otpAuthService.verifyOtp(request.matPers(), request.otp());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(session.refreshToken()).toString())
                .body(ApiResponse.success(session.authResponse()));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renouveler l'access token via cookie HttpOnly")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @CookieValue(name = "${app.jwt.refresh-cookie-name}", required = false) String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new UnauthorizedException("Refresh token manquant.");
        }
        OtpAuthService.TokenSession session = otpAuthService.refresh(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(session.refreshToken()).toString())
                .body(ApiResponse.success(session.authResponse()));
    }

    @GetMapping("/me")
    @Operation(summary = "Profil connecté (MAT_PERS)")
    public ResponseEntity<ApiResponse<AuthProfileResponse>> me(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(otpAuthService.getProfile((String) authentication.getPrincipal())));
    }

    @PostMapping("/logout")
    @Operation(summary = "Déconnexion et révocation du refresh token")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(name = "${app.jwt.refresh-cookie-name}", required = false) String refreshToken) {
        otpAuthService.logout(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .body(ApiResponse.success("Déconnexion réussie.", null));
    }

    private ResponseCookie buildRefreshCookie(String value) {
        return ResponseCookie.from(jwtProperties.getRefreshCookieName(), value)
                .httpOnly(true)
                .secure(jwtProperties.isRefreshCookieSecure())
                .sameSite(jwtProperties.getRefreshCookieSameSite())
                .path("/api/auth")
                .maxAge(Duration.ofMillis(jwtProperties.getRefreshTokenExpiration()))
                .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(jwtProperties.getRefreshCookieName(), "")
                .httpOnly(true)
                .secure(jwtProperties.isRefreshCookieSecure())
                .sameSite(jwtProperties.getRefreshCookieSameSite())
                .path("/api/auth")
                .maxAge(Duration.ZERO)
                .build();
    }
}
