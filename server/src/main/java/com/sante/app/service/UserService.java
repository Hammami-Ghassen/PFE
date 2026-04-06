package com.sante.app.service;

import com.sante.app.dto.request.CreateUserRequest;
import com.sante.app.dto.request.UpdateUserRequest;
import com.sante.app.dto.response.UserResponse;
import com.sante.app.exception.BadRequestException;
import com.sante.app.exception.ResourceNotFoundException;
import com.sante.app.model.User;
import com.sante.app.repository.RefreshTokenRepository;
import com.sante.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordGeneratorService passwordGeneratorService;
    private final AuthService authService;

    public Page<UserResponse> getUsers(String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<User> users = (search != null && !search.isBlank())
                ? userRepository.searchUsers(search, pageable)
                : userRepository.findAll(pageable);
        return users.map(authService::mapToUserResponse);
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'ID: " + id));
        return authService.mapToUserResponse(user);
    }

    @Transactional
    public Map<String, Object> createUser(CreateUserRequest request) {
        if (userRepository.existsByCin(request.getCin())) {
            throw new BadRequestException("Un utilisateur avec ce CIN existe déjà.");
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()
                && userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Un utilisateur avec cet email existe déjà.");
        }

        String rawPassword = passwordGeneratorService.generatePassword();

        User user = User.builder()
                .cin(request.getCin())
                .nom(request.getNom())
                .prenom(request.getPrenom())
                .email(request.getEmail())
                .role(request.getRole())
                .password(passwordEncoder.encode(rawPassword))
                .active(true)
                .mustChangePassword(true)
                .build();

        user = userRepository.save(user);

        Map<String, Object> result = new HashMap<>();
        result.put("user", authService.mapToUserResponse(user));
        result.put("generatedPassword", rawPassword);
        return result;
    }

    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'ID: " + id));

        if (request.getEmail() != null && !request.getEmail().isBlank()
                && !request.getEmail().equals(user.getEmail())
                && userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Un utilisateur avec cet email existe déjà.");
        }

        user.setNom(request.getNom());
        user.setPrenom(request.getPrenom());
        user.setEmail(request.getEmail());
        user.setRole(request.getRole());

        return authService.mapToUserResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse toggleStatus(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'ID: " + id));
        user.setActive(!user.getActive());
        if (!user.getActive()) {
            refreshTokenRepository.revokeAllUserTokens(user);
        }
        return authService.mapToUserResponse(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'ID: " + id));
        refreshTokenRepository.deleteAllByUser(user);
        userRepository.delete(user);
    }

    @Transactional
    public String resetPassword(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'ID: " + id));
        String newPassword = passwordGeneratorService.generatePassword();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(true);
        refreshTokenRepository.revokeAllUserTokens(user);
        userRepository.save(user);
        return newPassword;
    }

    public Map<String, Long> getStats() {
        long total = userRepository.count();
        long active = userRepository.countByActiveTrue();
        long inactive = userRepository.countByActiveFalse();

        Map<String, Long> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("active", active);
        stats.put("inactive", inactive);
        return stats;
    }
}
