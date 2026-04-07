package com.sante.app.controller;

import com.sante.app.dto.request.UpdatePersonnelRoleRequest;
import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.EstablishmentResponse;
import com.sante.app.dto.response.PersonnelAdminResponse;
import com.sante.app.service.LegacyAdminService;
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
@Tag(name = "Administration Personnel", description = "Recherche et gestion des rôles (legacy PERSONNEL)")
public class LegacyAdminController {

    private final LegacyAdminService legacyAdminService;

    @GetMapping
    @Operation(summary = "Rechercher le personnel par MAT_PERS et COD_SOC")
    public ResponseEntity<ApiResponse<Page<PersonnelAdminResponse>>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String codSoc,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.success(legacyAdminService.searchPersonnel(search, codSoc, page, size)));
    }

    @PatchMapping("/{matPers}/role")
    @Operation(summary = "Mettre à jour COD_USER d'un personnel")
    public ResponseEntity<ApiResponse<PersonnelAdminResponse>> updateRole(
            @PathVariable String matPers,
            @Valid @RequestBody UpdatePersonnelRoleRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Rôle mis à jour", legacyAdminService.updateRole(matPers, request.getCodUser())));
    }

    @GetMapping("/establishments")
    @Operation(summary = "Lister les établissements SOCIETE")
    public ResponseEntity<ApiResponse<List<EstablishmentResponse>>> establishments() {
        return ResponseEntity.ok(ApiResponse.success(legacyAdminService.establishments()));
    }
}
