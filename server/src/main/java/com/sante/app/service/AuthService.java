package com.sante.app.service;

import com.sante.app.dto.request.LoginRequest;
import com.sante.app.dto.response.AuthResponse;
import com.sante.app.dto.response.UserResponse;
import com.sante.app.exception.BadRequestException;
import com.sante.app.exception.UnauthorizedException;
import com.sante.app.model.RefreshToken;
import com.sante.app.model.User;
import com.sante.app.repository.RefreshTokenRepository;
import com.sante.app.repository.UserRepository;
import com.sante.app.security.jwt.JwtProperties;
import com.sante.app.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getCin(), request.getPassword())
            );
        } catch (DisabledException e) {
            throw new UnauthorizedException("Compte désactivé. Contactez l'administrateur.");
        } catch (BadCredentialsException e) {
            throw new UnauthorizedException("CIN ou mot de passe incorrect.");
        }

        User user = userRepository.findByCin(request.getCin())
                .orElseThrow(() -> new UnauthorizedException("Utilisateur non trouvé."));

        String accessToken = jwtTokenProvider.generateAccessToken(user.getCin(), user.getRole().name());
        String refreshToken = createRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtProperties.getAccessTokenExpiration() / 1000)
                .user(mapToUserResponse(user))
                .build();
    }

    @Transactional
    public AuthResponse refresh(String refreshTokenValue) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(refreshTokenValue)
                .orElseThrow(() -> new UnauthorizedException("Refresh token invalide."));

        if (refreshToken.getRevoked()) {
            // Possible token reuse attack — revoke everything
            refreshTokenRepository.revokeAllUserTokens(refreshToken.getUser());
            throw new UnauthorizedException("Refresh token révoqué. Reconnectez-vous.");
        }

        if (refreshToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Refresh token expiré. Reconnectez-vous.");
        }

        // Rotation: revoke old, create new
        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        User user = refreshToken.getUser();
        String newAccessToken = jwtTokenProvider.generateAccessToken(user.getCin(), user.getRole().name());
        String newRefreshToken = createRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtProperties.getAccessTokenExpiration() / 1000)
                .build();
    }

    @Transactional
    public void logout(String cin) {
        userRepository.findByCin(cin).ifPresent(refreshTokenRepository::revokeAllUserTokens);
    }

    private String createRefreshToken(User user) {
        String tokenValue = UUID.randomUUID().toString();
        long expirationMs = jwtProperties.getRefreshTokenExpiration();

        RefreshToken token = RefreshToken.builder()
                .token(tokenValue)
                .user(user)
                .expiryDate(LocalDateTime.now().plusSeconds(expirationMs / 1000))
                .revoked(false)
                .build();

        refreshTokenRepository.save(token);
        return tokenValue;
    }

    public UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .cin(user.getCin())
                .nom(user.getNom())
                .prenom(user.getPrenom())
                .email(user.getEmail())
                .role(user.getRole())
                .active(user.getActive())
                .mustChangePassword(user.getMustChangePassword())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
