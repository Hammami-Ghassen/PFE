package com.sante.app.controller;

import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.LeaveBalanceResponse;
import com.sante.app.service.LeaveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leaves")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('DIRECTEUR','ADMIN')")
@Tag(name = "Solde des conges", description = "Consultation du solde de conge")
public class LeaveBalanceController {

    private final LeaveService leaveService;

    @GetMapping("/balance/{matPers}")
    @Operation(summary = "Consulter le solde de conge d'un agent")
    public ResponseEntity<ApiResponse<LeaveBalanceResponse>> balanceByMatPers(
            Authentication authentication,
            @PathVariable String matPers) {
        String requesterMatPers = (String) authentication.getPrincipal();
        LeaveBalanceResponse response = leaveService.getBalanceForPerson(requesterMatPers, matPers);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
