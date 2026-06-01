package com.sante.app.service;

import com.sante.app.dto.response.AdminCorrectionRequestResponse;
import com.sante.app.dto.response.CorrectionAttachmentResponse;
import com.sante.app.dto.response.CorrectionRequestResponse;
import com.sante.app.exception.BadRequestException;
import com.sante.app.exception.ResourceNotFoundException;
import com.sante.app.model.correction.CorrectionRequestStatus;
import com.sante.app.model.correction.CorrectionTargetAttribute;
import com.sante.app.model.correction.DemandeCorrectionInfo;
import com.sante.app.repository.AdrPersRepository;
import com.sante.app.repository.DemandeCorrectionInfoRepository;
import com.sante.app.repository.PersonnelRepository;
import com.sante.app.repository.projection.CorrectionAdminProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CorrectionService {

    private static final int MIN_PAGE_SIZE = 1;
    private static final int MAX_PAGE_SIZE = 200;
    private static final long MAX_ATTACHMENT_SIZE_BYTES = 2L * 1024L * 1024L;

    private final DemandeCorrectionInfoRepository demandeCorrectionInfoRepository;
    private final PersonnelRepository personnelRepository;
    private final AdrPersRepository adrPersRepository;

    @Transactional
    public CorrectionRequestResponse createRequest(String matPers,
                                                   CorrectionTargetAttribute attributCible,
                                                   String nouvelleValeur,
                                                   MultipartFile pieceJointe) {
        String normalizedMatPers = normalizeMatPers(matPers);
        CorrectionTargetAttribute normalizedAttribut = requireAttribut(attributCible);
        String normalizedValue = normalizeNouvelleValeur(nouvelleValeur);
        validateAttachment(pieceJointe);

        if (!personnelRepository.existsById(normalizedMatPers)) {
            throw new ResourceNotFoundException("Personnel introuvable pour MAT_PERS: " + normalizedMatPers);
        }

        DemandeCorrectionInfo entity = new DemandeCorrectionInfo();
        entity.setMatPers(normalizedMatPers);
        entity.setAttributCible(normalizedAttribut);
        entity.setAncienneValeur(emptyToNull(readCurrentValue(normalizedMatPers, normalizedAttribut)));
        entity.setNouvelleValeur(normalizedValue);
        entity.setStatut(CorrectionRequestStatus.PENDING);
        if (pieceJointe != null && !pieceJointe.isEmpty()) {
            entity.setPieceJointe(toBytes(pieceJointe));
            entity.setPieceJointeNom(normalizeAttachmentFileName(pieceJointe.getOriginalFilename()));
            entity.setPieceJointeType(emptyToNull(pieceJointe.getContentType()) == null ? "application/octet-stream" : pieceJointe.getContentType());
            entity.setPieceJointeTaille(pieceJointe.getSize());
        }

        DemandeCorrectionInfo saved = demandeCorrectionInfoRepository.saveAndFlush(entity);
        return mapUserResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<AdminCorrectionRequestResponse> getCorrectionRequests(String status, int page, int size) {
        int sanitizedPage = Math.max(0, page);
        int sanitizedSize = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, size));
        Pageable pageable = PageRequest.of(sanitizedPage, sanitizedSize);

        CorrectionRequestStatus filterStatus = parseNullableStatus(status);
        String filter = filterStatus == null ? null : filterStatus.name();

        return demandeCorrectionInfoRepository.findForAdmin(filter, pageable).map(this::mapAdminResponse);
    }

    @Transactional
    public AdminCorrectionRequestResponse reviewCorrection(Long id, CorrectionRequestStatus status) {
        if (id == null || id <= 0) {
            throw new BadRequestException("Identifiant de demande invalide.");
        }

        CorrectionRequestStatus reviewStatus = requireReviewStatus(status);
        DemandeCorrectionInfo request = demandeCorrectionInfoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande introuvable: " + id));

        if (request.getStatut() != CorrectionRequestStatus.PENDING) {
            throw new BadRequestException("Cette demande a déjà été traitée.");
        }

        if (reviewStatus == CorrectionRequestStatus.APPROVED) {
            applyApprovedChange(request);
        }

        request.setStatut(reviewStatus);
        demandeCorrectionInfoRepository.save(request);

        return demandeCorrectionInfoRepository.findAdminProjectionById(id)
                .map(this::mapAdminResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Demande introuvable: " + id));
    }

    @Transactional(readOnly = true)
    public CorrectionAttachmentResponse getAttachment(Long id) {
        if (id == null || id <= 0) {
            throw new BadRequestException("Identifiant de demande invalide.");
        }

        DemandeCorrectionInfo request = demandeCorrectionInfoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande introuvable: " + id));

        byte[] content = request.getPieceJointe();
        if (content == null || content.length == 0) {
            throw new ResourceNotFoundException("Aucune pièce jointe trouvée pour la demande: " + id);
        }

        return new CorrectionAttachmentResponse(
                resolveAttachmentFileName(request),
                emptyToNull(request.getPieceJointeType()) == null ? "application/octet-stream" : request.getPieceJointeType(),
                content);
    }

    private CorrectionTargetAttribute requireAttribut(CorrectionTargetAttribute attributCible) {
        if (attributCible == null) {
            throw new BadRequestException("L'attribut à corriger est obligatoire.");
        }
        return attributCible;
    }

    private String normalizeMatPers(String matPers) {
        if (matPers == null || matPers.isBlank()) {
            throw new BadRequestException("MAT_PERS est obligatoire.");
        }
        String normalized = matPers.trim();
        if (!normalized.matches("\\d{8}")) {
            throw new BadRequestException("MAT_PERS doit contenir exactement 8 chiffres.");
        }
        return normalized;
    }

    private String normalizeNouvelleValeur(String nouvelleValeur) {
        if (nouvelleValeur == null || nouvelleValeur.isBlank()) {
            throw new BadRequestException("La nouvelle valeur est obligatoire.");
        }

        String normalized = nouvelleValeur.trim();
        if (normalized.length() > 500) {
            throw new BadRequestException("La nouvelle valeur ne doit pas dépasser 500 caractères.");
        }

        return normalized;
    }

    private void validateAttachment(MultipartFile pieceJointe) {
        if (pieceJointe != null && !pieceJointe.isEmpty()) {
            if (pieceJointe.getSize() > MAX_ATTACHMENT_SIZE_BYTES) {
                throw new BadRequestException("La pièce jointe dépasse la taille maximale de 2 Mo.");
            }
        }
    }

    private String normalizeAttachmentFileName(String fileName) {
        String normalized = emptyToNull(fileName);
        if (normalized == null) {
            return "piece-jointe-correction.bin";
        }
        return normalized.length() <= 255 ? normalized : normalized.substring(0, 255);
    }

    private String resolveAttachmentFileName(DemandeCorrectionInfo request) {
        String storedName = emptyToNull(request.getPieceJointeNom());
        if (storedName != null) {
            return storedName;
        }

        String extension = extensionFromContentType(request.getPieceJointeType());
        return "demande-correction-" + request.getId() + extension;
    }

    private String extensionFromContentType(String contentType) {
        String normalized = emptyToNull(contentType);
        if (normalized == null) {
            return "";
        }
        return switch (normalized.toLowerCase(Locale.ROOT)) {
            case "application/pdf" -> ".pdf";
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> ".docx";
            default -> "";
        };
    }

    private byte[] toBytes(MultipartFile pieceJointe) {
        try {
            return pieceJointe.getBytes();
        } catch (IOException ex) {
            throw new BadRequestException("Impossible de lire la pièce jointe.");
        }
    }

    private String readCurrentValue(String matPers, CorrectionTargetAttribute attribut) {
        return switch (attribut) {
            case NOM -> personnelRepository.findNomPersByMatPers(matPers);
            case PRENOM -> personnelRepository.findPrenomPersByMatPers(matPers);
            case ADRESSE -> adrPersRepository.findRueByMatPers(matPers);
            case TELEPHONE -> adrPersRepository.findTelPortPersByMatPers(matPers);
            case EMAIL -> adrPersRepository.findAdrElectroniqueByMatPers(matPers);
        };
    }

    private void applyApprovedChange(DemandeCorrectionInfo request) {
        String matPers = request.getMatPers();
        String nouvelleValeur = request.getNouvelleValeur();

        int updatedRows = switch (request.getAttributCible()) {
            case NOM -> personnelRepository.updateNomPers(matPers, nouvelleValeur);
            case PRENOM -> personnelRepository.updatePrenomPers(matPers, nouvelleValeur);
            case ADRESSE -> adrPersRepository.updateRue(matPers, nouvelleValeur);
            case TELEPHONE -> adrPersRepository.updateTelPortPers(matPers, nouvelleValeur);
            case EMAIL -> adrPersRepository.updateAdrElectronique(matPers, nouvelleValeur);
        };

        if (updatedRows == 0) {
            throw new ResourceNotFoundException("Impossible d'appliquer la correction pour MAT_PERS: " + matPers);
        }
    }

    private CorrectionRequestStatus parseNullableStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }

        try {
            return CorrectionRequestStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Statut invalide. Valeurs autorisées: PENDING, APPROVED, REJECTED.");
        }
    }

    private CorrectionRequestStatus requireReviewStatus(CorrectionRequestStatus status) {
        if (status == null) {
            throw new BadRequestException("Le statut est obligatoire.");
        }
        if (status == CorrectionRequestStatus.PENDING) {
            throw new BadRequestException("Le statut PENDING n'est pas autorisé pour la revue.");
        }
        return status;
    }

    private String emptyToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private CorrectionRequestResponse mapUserResponse(DemandeCorrectionInfo request) {
        return new CorrectionRequestResponse(
                request.getId(),
                request.getMatPers(),
                request.getAttributCible().name(),
                emptyToNull(request.getAncienneValeur()),
                request.getNouvelleValeur(),
                request.getStatut().name(),
                request.getDateDemande());
    }

    private AdminCorrectionRequestResponse mapAdminResponse(CorrectionAdminProjection projection) {
        return new AdminCorrectionRequestResponse(
                projection.getId(),
                projection.getMatPers(),
                emptyToNull(projection.getFullName()),
                projection.getAttributCible(),
                emptyToNull(projection.getAncienneValeur()),
                projection.getNouvelleValeur(),
                projection.getStatut(),
                projection.getDateDemande(),
                Boolean.TRUE.equals(projection.getHasAttachment()));
    }
}
