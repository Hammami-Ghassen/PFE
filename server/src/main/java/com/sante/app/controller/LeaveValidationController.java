package com.sante.app.controller;

import com.sante.app.dto.request.ReviewLeaveRequest;
import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.LeaveValidationResponse;
import com.sante.app.service.LeaveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leaves/validation")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DIRECTEUR')")
@Tag(name = "Validation des conges", description = "Traitement des demandes de conge")
public class LeaveValidationController {

    private final LeaveService leaveService;

    @GetMapping
    @Operation(summary = "Lister les demandes a valider")
    public ResponseEntity<ApiResponse<Page<LeaveValidationResponse>>> queue(
            Authentication authentication,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        String reviewerMatPers = (String) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success(leaveService.getValidationQueue(reviewerMatPers, status, page, size)));
    }

    @PatchMapping("/{codSoc}/{matPers}/{numDcng}/review")
    @Operation(summary = "Accepter ou refuser une demande de conge")
    public ResponseEntity<ApiResponse<LeaveValidationResponse>> review(
            Authentication authentication,
            @PathVariable String codSoc,
            @PathVariable String matPers,
            @PathVariable Integer numDcng,
            @Valid @RequestBody ReviewLeaveRequest request) {
        String reviewerMatPers = (String) authentication.getPrincipal();
        LeaveValidationResponse response = leaveService.reviewRequest(
                reviewerMatPers,
                codSoc,
                matPers,
                numDcng,
            request.status(),
            request.comment());
        return ResponseEntity.ok(ApiResponse.success("Demande de conge traitee.", response));
    }
}
