package com.sante.app.controller;

import com.sante.app.dto.request.ReviewCorrectionRequest;
import com.sante.app.dto.response.AdminCorrectionRequestResponse;
import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.CorrectionAttachmentResponse;
import com.sante.app.service.CorrectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
@RequestMapping("/api/admin/corrections")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Administration corrections", description = "Validation et rejet des demandes de correction")
public class AdminCorrectionController {

    private final CorrectionService correctionService;

    @GetMapping
    @Operation(summary = "Lister les demandes de correction")
    public ResponseEntity<ApiResponse<Page<AdminCorrectionRequestResponse>>> listCorrections(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.success(correctionService.getCorrectionRequests(status, page, size)));
    }

    @PatchMapping("/{id}/review")
    @Operation(summary = "Valider ou rejeter une demande de correction")
    public ResponseEntity<ApiResponse<AdminCorrectionRequestResponse>> reviewCorrection(
            @PathVariable Long id,
            @Valid @RequestBody ReviewCorrectionRequest request) {
        AdminCorrectionRequestResponse response = correctionService.reviewCorrection(id, request.status());
        return ResponseEntity.ok(ApiResponse.success("Demande de correction mise à jour.", response));
    }

    @GetMapping("/{id}/attachment")
    @Operation(summary = "Télécharger la pièce jointe d'une demande")
    public ResponseEntity<byte[]> downloadAttachment(@PathVariable Long id) {
        CorrectionAttachmentResponse attachment = correctionService.getAttachment(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(attachment.fileName(), StandardCharsets.UTF_8).build().toString())
                .header("X-Attachment-Filename", attachment.fileName())
                .contentType(MediaType.parseMediaType(attachment.fileType()))
                .body(attachment.content());
    }
}
