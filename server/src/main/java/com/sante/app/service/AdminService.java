package com.sante.app.service;

import com.sante.app.dto.request.UpdatePersonnelAdminRequest;
import com.sante.app.dto.response.AuthProfileResponse;
import com.sante.app.dto.response.EstablishmentResponse;
import com.sante.app.dto.response.PersonnelAdminResponse;
import com.sante.app.exception.BadRequestException;
import com.sante.app.exception.ResourceNotFoundException;
import com.sante.app.model.legacy.Personnel;
import com.sante.app.repository.AdrPersRepository;
import com.sante.app.repository.PersonnelRepository;
import com.sante.app.repository.SocieteRepository;
import com.sante.app.repository.projection.PersonnelAdminProjection;
import com.sante.app.repository.projection.ProfileProjection;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminService {

    private static final int MIN_PAGE_SIZE = 1;
    private static final int MAX_PAGE_SIZE = 200;
    private static final List<String> VALID_ROLES = List.of("AGENT", "DIRECTEUR", "ADMIN");

    private final PersonnelRepository personnelRepository;
    private final AdrPersRepository adrPersRepository;
    private final SocieteRepository societeRepository;

    @Transactional(readOnly = true)
    public Page<PersonnelAdminResponse> searchPersonnel(String search, String codSoc, int page, int size) {
        int sanitizedPage = Math.max(0, page);
        int sanitizedSize = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, size));
        Pageable pageable = PageRequest.of(sanitizedPage, sanitizedSize, Sort.by(Sort.Direction.ASC, "matPers"));
        String normalizedSearch = emptyToNull(search);
        String normalizedCodSoc = normalizeUpperNullable(codSoc);
        return personnelRepository.searchPersonnel(normalizedSearch, normalizedCodSoc, pageable)
                .map(this::mapProjection);
    }

    @Transactional(readOnly = true)
    public AuthProfileResponse getPersonnelProfile(String matPers) {
        String normalizedMatPers = normalizeMatPers(matPers);
        ProfileProjection profile = personnelRepository.findAuthProfileByMatPers(normalizedMatPers);
        if (profile == null) {
            throw new ResourceNotFoundException("Personnel introuvable pour MAT_PERS: " + normalizedMatPers);
        }

        return new AuthProfileResponse(
                profile.getMatPers(),
                emptyToNull(profile.getFirstName()),
                emptyToNull(profile.getLastName()),
                buildFullName(profile.getFirstName(), profile.getLastName()),
                profile.getCodUser(),
                profile.getCodSoc(),
                profile.getEstablishmentName(),
                profile.getEmail(),
                profile.getPhone(),
                buildAdresse(profile.getRue(), profile.getLibDeleg(), profile.getLibGouv()),
                emptyToNull(profile.getService()),
                emptyToNull(profile.getGrade()),
                emptyToNull(profile.getPosteTravail()));
    }

    @Transactional
    public PersonnelAdminResponse updateRole(String matPers, String codUser) {
        String normalizedMatPers = normalizeMatPers(matPers);
        String normalizedRole = normalizeRole(codUser);

        int updated = personnelRepository.updateCodUser(normalizedMatPers, normalizedRole);
        if (updated == 0) {
            throw new ResourceNotFoundException("Personnel introuvable pour MAT_PERS: " + normalizedMatPers);
        }

        return findAdminResponse(normalizedMatPers);
    }

    @Transactional
    public PersonnelAdminResponse updatePersonnel(String matPers, UpdatePersonnelAdminRequest request) {
        String normalizedMatPers = normalizeMatPers(matPers);
        Personnel personnel = personnelRepository.findById(normalizedMatPers)
                .orElseThrow(() -> new ResourceNotFoundException("Personnel introuvable pour MAT_PERS: " + normalizedMatPers));

        personnelRepository.updateCodUser(normalizedMatPers, normalizeRole(request.codUser()));
        updateContact(normalizedMatPers, personnel.getCodSoc(), emptyToNull(request.email()), emptyToNull(request.phone()));

        return findAdminResponse(normalizedMatPers);
    }

    @Transactional(readOnly = true)
    public List<EstablishmentResponse> establishments() {
        return societeRepository.findAllByOrderByCodSocAsc().stream()
                .map(s -> new EstablishmentResponse(s.getCodSoc(), s.getLibSoc()))
                .toList();
    }

    private PersonnelAdminResponse findAdminResponse(String matPers) {
        PersonnelAdminProjection projection = personnelRepository.findAdminProjectionByMatPers(matPers);
        if (projection == null) {
            throw new ResourceNotFoundException("Personnel introuvable pour MAT_PERS: " + matPers);
        }
        return mapProjection(projection);
    }

    private void updateContact(String matPers, String codSoc, String email, String phone) {
        if (adrPersRepository.countByMatPers(matPers) == 0) {
            adrPersRepository.insertContactRow(codSoc, matPers, email, phone);
            return;
        }

        adrPersRepository.updateAdrElectronique(matPers, email);
        adrPersRepository.updateTelPortPers(matPers, phone);
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

    private String normalizeRole(String codUser) {
        String normalized = emptyToNull(codUser);
        if (normalized == null) {
            throw new BadRequestException("COD_USER est obligatoire.");
        }
        normalized = normalized.toUpperCase();
        if (!VALID_ROLES.contains(normalized)) {
            throw new BadRequestException("Role invalide: " + codUser + ". Valeurs autorisees: " + VALID_ROLES);
        }
        return normalized;
    }

    private String normalizeUpperNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase();
    }

    private String buildAdresse(String rue, String libDeleg, String libGouv) {
        ArrayList<String> parts = new ArrayList<>(3);
        addIfPresent(parts, rue);
        addIfPresent(parts, libDeleg);
        addIfPresent(parts, libGouv);
        return parts.isEmpty() ? null : String.join(", ", parts);
    }

    private void addIfPresent(ArrayList<String> parts, String value) {
        String normalized = emptyToNull(value);
        if (normalized != null) {
            parts.add(normalized);
        }
    }

    private String buildFullName(String firstName, String lastName) {
        String normalizedFirst = emptyToNull(firstName);
        String normalizedLast = emptyToNull(lastName);
        if (normalizedFirst == null && normalizedLast == null) {
            return null;
        }
        if (normalizedFirst == null) {
            return normalizedLast;
        }
        if (normalizedLast == null) {
            return normalizedFirst;
        }
        return normalizedFirst + " " + normalizedLast;
    }

    private String emptyToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private PersonnelAdminResponse mapProjection(PersonnelAdminProjection p) {
        return new PersonnelAdminResponse(
                p.getMatPers(),
                p.getNomPers(),
                p.getPrenomPers(),
                p.getCodUser(),
                p.getCodSoc(),
                p.getLibSoc(),
                p.getAdrElectronique(),
                p.getTelPortPers());
    }
}
