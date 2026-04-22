package com.sante.app.controller;

import com.sante.app.dto.request.CreateLeaveRequest;
import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.LeaveMotifResponse;
import com.sante.app.dto.response.LeaveRequestResponse;
import com.sante.app.service.LeaveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leaves")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('AGENT','DIRECTEUR')")
@Tag(name = "Gestion des conges", description = "Creation et suivi des demandes de conge")
public class LeaveController {

    private final LeaveService leaveService;

    @GetMapping("/motifs")
    @Operation(summary = "Lister les motifs de conge")
    public ResponseEntity<ApiResponse<List<LeaveMotifResponse>>> motifs() {
        return ResponseEntity.ok(ApiResponse.success(leaveService.getMotifs()));
    }

    @PostMapping
    @Operation(summary = "Deposer une demande de conge")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> createLeaveRequest(
            Authentication authentication,
            @Valid @RequestBody CreateLeaveRequest request) {
        String matPers = (String) authentication.getPrincipal();
        LeaveRequestResponse response = leaveService.createRequest(matPers, request);
        return ResponseEntity.ok(ApiResponse.success("Demande de conge creee.", response));
    }

    @GetMapping("/my")
    @Operation(summary = "Lister mes demandes de conge")
    public ResponseEntity<ApiResponse<Page<LeaveRequestResponse>>> myRequests(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        String matPers = (String) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success(leaveService.getMyRequests(matPers, page, size)));
    }
}
