package com.sante.app.controller;

import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.CorrectionRequestResponse;
import com.sante.app.model.correction.CorrectionTargetAttribute;
import com.sante.app.service.CorrectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/corrections")
@RequiredArgsConstructor
@Tag(name = "Demandes de correction", description = "Soumission des demandes de correction par les utilisateurs")
public class CorrectionController {

    private final CorrectionService correctionService;

    @PostMapping(value = "/request", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Soumettre une demande de correction")
    public ResponseEntity<ApiResponse<CorrectionRequestResponse>> requestCorrection(
            Authentication authentication,
            @RequestParam("attributCible") CorrectionTargetAttribute attributCible,
            @RequestParam("nouvelleValeur") String nouvelleValeur,
            @RequestPart("pieceJointe") MultipartFile pieceJointe) {
        String matPers = (String) authentication.getPrincipal();
        CorrectionRequestResponse response = correctionService.createRequest(matPers, attributCible, nouvelleValeur, pieceJointe);
        return ResponseEntity.ok(ApiResponse.success("Demande de correction envoyée.", response));
    }
}
