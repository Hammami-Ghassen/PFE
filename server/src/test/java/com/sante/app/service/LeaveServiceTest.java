package com.sante.app.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sante.app.dto.request.CreateLeaveRequest;
import com.sante.app.dto.response.LeaveRequestResponse;
import com.sante.app.dto.response.LeaveValidationResponse;
import com.sante.app.exception.UnauthorizedException;
import com.sante.app.model.leave.DemCng;
import com.sante.app.model.leave.DemCngId;
import com.sante.app.model.leave.LeaveValidationStatus;
import com.sante.app.model.leave.MotifJ;
import com.sante.app.model.legacy.Personnel;
import com.sante.app.repository.DemCngRepository;
import com.sante.app.repository.MotifJRepository;
import com.sante.app.repository.PersonnelRepository;
import com.sante.app.repository.projection.LeaveValidationProjection;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class LeaveServiceTest {

    @Mock
    private DemCngRepository demCngRepository;
    @Mock
    private MotifJRepository motifJRepository;
    @Mock
    private PersonnelRepository personnelRepository;

    private LeaveService leaveService;

    @BeforeEach
    void setUp() {
        leaveService = new LeaveService(demCngRepository, motifJRepository, personnelRepository);
    }

    @Test
    void createRequest_setsPendingStatusAndComputesDays() {
        Personnel actor = buildPersonnel("00091651", "AGENT", "0002");
        MotifJ motif = new MotifJ();
        motif.setCodM("01");
        motif.setLibMot("Conge annuel");
        motif.setTypCng("01");

        when(personnelRepository.findById("00091651")).thenReturn(Optional.of(actor));
        when(motifJRepository.findById("01")).thenReturn(Optional.of(motif));
        when(demCngRepository.findNextNumDcng("0002", "00091651")).thenReturn(4);
        when(demCngRepository.saveAndFlush(any(DemCng.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateLeaveRequest request = new CreateLeaveRequest(
                LocalDate.of(2026, 5, 1),
                LocalDate.of(2026, 5, 3),
                "01",
                "Commentaire test");

        LeaveRequestResponse response = leaveService.createRequest("00091651", request);

        assertEquals("0002", response.codSoc());
        assertEquals("00091651", response.matPers());
        assertEquals(4, response.numDcng());
        assertEquals("I", response.statusCode());
        assertEquals("En attente", response.statusLabel());
        assertEquals(new BigDecimal("3.000"), response.nbrJours());

        ArgumentCaptor<DemCng> captor = ArgumentCaptor.forClass(DemCng.class);
        verify(demCngRepository).saveAndFlush(captor.capture());
        DemCng saved = captor.getValue();

        assertEquals("I", saved.getValid());
        assertEquals(new DemCngId("0002", "00091651", 4), saved.getId());
        assertEquals(new BigDecimal("3.000"), saved.getNbrJours());
        assertEquals(LocalDate.now(), saved.getDatDcng());
    }

    @Test
    void getValidationQueue_ministryUsesMinistryQuery() {
        Personnel reviewer = buildPersonnel("00000001", "DIRECTEUR", "0001");
        when(personnelRepository.findById("00000001")).thenReturn(Optional.of(reviewer));

        LeaveValidationProjection projection = buildValidationProjection("0002", "00091651", "AGENT", "I");
        Page<LeaveValidationProjection> page = new PageImpl<>(List.of(projection));
        when(demCngRepository.findValidationQueueForMinistry(eq("I"), any(Pageable.class))).thenReturn(page);

        Page<LeaveValidationResponse> result = leaveService.getValidationQueue("00000001", "I", 0, 50);

        assertEquals(1, result.getTotalElements());
        assertEquals("I", result.getContent().get(0).statusCode());
        verify(demCngRepository).findValidationQueueForMinistry(eq("I"), any(Pageable.class));
        verify(demCngRepository, never()).findValidationQueueForDirector(any(), any(), any(Pageable.class));
    }

    @Test
    void getValidationQueue_directorUsesEstablishmentQuery() {
        Personnel reviewer = buildPersonnel("00000002", "DIRECTEUR", "0002");
        when(personnelRepository.findById("00000002")).thenReturn(Optional.of(reviewer));

        LeaveValidationProjection projection = buildValidationProjection("0002", "00091651", "AGENT", "I");
        Page<LeaveValidationProjection> page = new PageImpl<>(List.of(projection));
        when(demCngRepository.findValidationQueueForDirector(eq("0002"), eq("I"), any(Pageable.class))).thenReturn(page);

        Page<LeaveValidationResponse> result = leaveService.getValidationQueue("00000002", "I", 0, 50);

        assertEquals(1, result.getTotalElements());
        verify(demCngRepository).findValidationQueueForDirector(eq("0002"), eq("I"), any(Pageable.class));
        verify(demCngRepository, never()).findValidationQueueForMinistry(any(), any(Pageable.class));
    }

    @Test
    void reviewRequest_updatesStatusWhenScopeIsValid() {
        Personnel reviewer = buildPersonnel("00000002", "DIRECTEUR", "0002");
        Personnel requester = buildPersonnel("00091651", "AGENT", "0002");

        DemCng demande = new DemCng();
        demande.setId(new DemCngId("0002", "00091651", 7));
        demande.setValid("I");
        demande.setDatDcng(LocalDate.of(2026, 4, 20));
        demande.setDatDebut(LocalDate.of(2026, 4, 22));
        demande.setDatFin(LocalDate.of(2026, 4, 24));
        demande.setCodeM("01");
        demande.setNbrJours(new BigDecimal("3.000"));

        when(personnelRepository.findById("00000002")).thenReturn(Optional.of(reviewer));
        when(personnelRepository.findById("00091651")).thenReturn(Optional.of(requester));
        when(demCngRepository.findById(new DemCngId("0002", "00091651", 7))).thenReturn(Optional.of(demande));
        when(demCngRepository.save(any(DemCng.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LeaveValidationProjection projection = buildValidationProjection("0002", "00091651", "AGENT", "O");
        when(demCngRepository.findValidationProjectionById("0002", "00091651", 7)).thenReturn(Optional.of(projection));

        LeaveValidationResponse response = leaveService.reviewRequest("00000002", "0002", "00091651", 7, "O");

        assertEquals("O", response.statusCode());

        ArgumentCaptor<DemCng> captor = ArgumentCaptor.forClass(DemCng.class);
        verify(demCngRepository).save(captor.capture());
        assertEquals(LeaveValidationStatus.APPROVED.getCode(), captor.getValue().getValid());
    }

    @Test
    void reviewRequest_rejectsMinistryWhenRequesterIsNotDirector() {
        Personnel reviewer = buildPersonnel("00000001", "DIRECTEUR", "0001");
        Personnel requester = buildPersonnel("00091651", "AGENT", "0002");

        DemCng demande = new DemCng();
        demande.setId(new DemCngId("0002", "00091651", 7));
        demande.setValid("I");

        when(personnelRepository.findById("00000001")).thenReturn(Optional.of(reviewer));
        when(personnelRepository.findById("00091651")).thenReturn(Optional.of(requester));
        when(demCngRepository.findById(new DemCngId("0002", "00091651", 7))).thenReturn(Optional.of(demande));

        UnauthorizedException ex = assertThrows(
                UnauthorizedException.class,
                () -> leaveService.reviewRequest("00000001", "0002", "00091651", 7, "N"));

        assertTrue(ex.getMessage().contains("ministere"));
        verify(demCngRepository, never()).save(any(DemCng.class));
    }

    private Personnel buildPersonnel(String matPers, String codUser, String codSoc) {
        Personnel personnel = new Personnel();
        personnel.setMatPers(matPers);
        personnel.setCodUser(codUser);
        personnel.setCodSoc(codSoc);
        personnel.setPrenPers("Test");
        personnel.setNomPers("User");
        return personnel;
    }

    private LeaveValidationProjection buildValidationProjection(String codSoc, String matPers, String role, String valid) {
        LeaveValidationProjection projection = org.mockito.Mockito.mock(LeaveValidationProjection.class);
        when(projection.getCodSoc()).thenReturn(codSoc);
        when(projection.getMatPers()).thenReturn(matPers);
        when(projection.getNumDcng()).thenReturn(7);
        when(projection.getFullName()).thenReturn("Test User");
        when(projection.getDemandeurRole()).thenReturn(role);
        when(projection.getDatDcng()).thenReturn(LocalDate.of(2026, 4, 20));
        when(projection.getDatDebut()).thenReturn(LocalDate.of(2026, 4, 22));
        when(projection.getDatFin()).thenReturn(LocalDate.of(2026, 4, 24));
        when(projection.getCodeM()).thenReturn("01");
        when(projection.getLibMot()).thenReturn("Conge annuel");
        when(projection.getNbrJours()).thenReturn(new BigDecimal("3.000"));
        when(projection.getValid()).thenReturn(valid);
        return projection;
    }
}
