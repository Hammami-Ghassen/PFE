package com.sante.app.controller;

import com.sante.app.dto.request.UpdatePersonnelAdminRequest;
import com.sante.app.dto.request.UpdatePersonnelRoleRequest;
import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.AuthProfileResponse;
import com.sante.app.dto.response.EstablishmentResponse;
import com.sante.app.dto.response.PersonnelAdminResponse;
import com.sante.app.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/personnel")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Administration Personnel", description = "Recherche et gestion du personnel legacy")
public class AdminController {

    private final AdminService adminService;

    @GetMapping
    @Operation(summary = "Rechercher le personnel")
    public ResponseEntity<ApiResponse<Page<PersonnelAdminResponse>>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String codSoc,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.success(adminService.searchPersonnel(search, codSoc, page, size)));
    }

    @GetMapping("/{matPers}")
    @Operation(summary = "Inspecter le profil complet d'un personnel")
    public ResponseEntity<ApiResponse<AuthProfileResponse>> details(@PathVariable String matPers) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getPersonnelProfile(matPers)));
    }

    @PatchMapping("/{matPers}")
    @Operation(summary = "Mettre a jour le role et les coordonnees d'un personnel")
    public ResponseEntity<ApiResponse<PersonnelAdminResponse>> updatePersonnel(
            @PathVariable String matPers,
            @Valid @RequestBody UpdatePersonnelAdminRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Personnel mis a jour", adminService.updatePersonnel(matPers, request)));
    }

    @PatchMapping("/{matPers}/role")
    @Operation(summary = "Mettre a jour COD_USER d'un personnel")
    public ResponseEntity<ApiResponse<PersonnelAdminResponse>> updateRole(
            @PathVariable String matPers,
            @Valid @RequestBody UpdatePersonnelRoleRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Role mis a jour", adminService.updateRole(matPers, request.codUser())));
    }

    @GetMapping("/establishments")
    @Operation(summary = "Lister les etablissements SOCIETE")
    public ResponseEntity<ApiResponse<List<EstablishmentResponse>>> establishments() {
        return ResponseEntity.ok(ApiResponse.success(adminService.establishments()));
    }
}
