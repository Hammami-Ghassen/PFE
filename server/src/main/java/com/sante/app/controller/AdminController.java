package com.sante.app.controller;

import com.sante.app.dto.request.CreateUserRequest;
import com.sante.app.dto.request.UpdateUserRequest;
import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.UserResponse;
import com.sante.app.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Administration", description = "Gestion des utilisateurs (Admin)")
public class AdminController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Liste des utilisateurs")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUsers(search, page, size)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détails d'un utilisateur")
    public ResponseEntity<ApiResponse<UserResponse>> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(id)));
    }

    @PostMapping
    @Operation(summary = "Créer un utilisateur")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createUser(@Valid @RequestBody CreateUserRequest request) {
        Map<String, Object> result = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Utilisateur créé avec succès", result));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier un utilisateur")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Utilisateur modifié avec succès", userService.updateUser(id, request)));
    }

    @PatchMapping("/{id}/toggle-status")
    @Operation(summary = "Activer/Désactiver un utilisateur")
    public ResponseEntity<ApiResponse<UserResponse>> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(userService.toggleStatus(id)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un utilisateur")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success("Utilisateur supprimé avec succès", null));
    }

    @PostMapping("/{id}/reset-password")
    @Operation(summary = "Réinitialiser le mot de passe")
    public ResponseEntity<ApiResponse<Map<String, String>>> resetPassword(@PathVariable Long id) {
        String newPassword = userService.resetPassword(id);
        return ResponseEntity.ok(ApiResponse.success("Mot de passe réinitialisé", Map.of("generatedPassword", newPassword)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Statistiques des utilisateurs")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(userService.getStats()));
    }
}
