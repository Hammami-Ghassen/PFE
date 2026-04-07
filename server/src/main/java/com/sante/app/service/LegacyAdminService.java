package com.sante.app.service;

import com.sante.app.dto.response.EstablishmentResponse;
import com.sante.app.dto.response.PersonnelAdminResponse;
import com.sante.app.exception.ResourceNotFoundException;
import com.sante.app.repository.PersonnelRepository;
import com.sante.app.repository.SocieteRepository;
import com.sante.app.repository.projection.PersonnelAdminProjection;
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
public class LegacyAdminService {

    private final PersonnelRepository personnelRepository;
    private final SocieteRepository societeRepository;
    private final LegacyRoleMapper roleMapper;

    @Transactional(readOnly = true)
    public Page<PersonnelAdminResponse> searchPersonnel(String search, String codSoc, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "matPers"));
        String normalizedSearch = normalizeNullable(search);
        String normalizedCodSoc = normalizeNullable(codSoc);
        return personnelRepository.searchPersonnel(normalizedSearch, normalizedCodSoc, pageable)
                .map(this::mapProjection);
    }

    @Transactional
    public PersonnelAdminResponse updateRole(String matPers, String codUser) {
        String normalizedMatPers = matPers.trim().toUpperCase();
        String normalizedCodUser = codUser.trim().toUpperCase();
        roleMapper.validateCodUser(normalizedCodUser);

        int updated = personnelRepository.updateCodUser(normalizedMatPers, normalizedCodUser);
        if (updated == 0) {
            throw new ResourceNotFoundException("Personnel introuvable pour MAT_PERS: " + normalizedMatPers);
        }

        PersonnelAdminProjection projection = personnelRepository.findAdminProjectionByMatPers(normalizedMatPers);
        if (projection == null) {
            throw new ResourceNotFoundException("Personnel introuvable pour MAT_PERS: " + normalizedMatPers);
        }
        return mapProjection(projection);
    }

    @Transactional(readOnly = true)
    public List<EstablishmentResponse> establishments() {
        return societeRepository.findAllByOrderByLibSocAsc().stream()
                .map(s -> EstablishmentResponse.builder().codSoc(s.getCodSoc()).libSoc(s.getLibSoc()).build())
                .toList();
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase();
    }

    private PersonnelAdminResponse mapProjection(PersonnelAdminProjection p) {
        return PersonnelAdminResponse.builder()
                .matPers(p.getMatPers())
                .codUser(p.getCodUser())
                .codSoc(p.getCodSoc())
                .establishmentName(p.getLibSoc())
                .email(p.getAdrElectronique())
                .phone(p.getTelPertPers())
                .build();
    }
}
