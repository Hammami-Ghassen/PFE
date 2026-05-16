package com.sante.app.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sante.app.dto.request.CreateLeaveRequest;
import com.sante.app.exception.BadRequestException;
import com.sante.app.model.leave.DemCng;
import com.sante.app.model.leave.MotifJ;
import com.sante.app.model.legacy.Personnel;
import com.sante.app.repository.DemCngRepository;
import com.sante.app.repository.JoursFeriersRepository;
import com.sante.app.repository.LeaveAttachmentRepository;
import com.sante.app.repository.MotifJRepository;
import com.sante.app.repository.PersonnelRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class LeaveServiceTest {

    @Mock
    private DemCngRepository demCngRepository;
    @Mock
    private MotifJRepository motifJRepository;
    @Mock
    private LeaveAttachmentRepository leaveAttachmentRepository;
    @Mock
    private PersonnelRepository personnelRepository;
    @Mock
    private JoursFeriersRepository joursFeriersRepository;
    @Mock
    private NotificationService notificationService;

    private LeaveService leaveService;

    @BeforeEach
    void setUp() {
        leaveService = new LeaveService(
                demCngRepository,
                motifJRepository,
                leaveAttachmentRepository,
                personnelRepository,
                joursFeriersRepository,
                notificationService);

        Personnel personnel = new Personnel();
        personnel.setMatPers("00000001");
        personnel.setCodSoc("0100");
        personnel.setCodUser("AGENT");

        lenient().when(personnelRepository.findById("00000001")).thenReturn(Optional.of(personnel));
        lenient().when(demCngRepository.hasOverlappingRequests(anyString(), anyString(), any(), any())).thenReturn(false);
        lenient().when(joursFeriersRepository.findAllByOrderByCodFerieAsc()).thenReturn(List.of());
        lenient().when(demCngRepository.findNextNumDcng(anyString(), anyString())).thenReturn(1);
        lenient().when(demCngRepository.saveAndFlush(any(DemCng.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(demCngRepository.sumCalendarDaysByCodesForYear(anyString(), anyString(), anyCollection(), anyInt(), anyCollection()))
                .thenReturn(BigDecimal.ZERO);
        lenient().when(demCngRepository.sumCalendarDaysByCodesForCareer(anyString(), anyString(), anyCollection(), anyCollection()))
                .thenReturn(BigDecimal.ZERO);
        lenient().when(demCngRepository.sumBusinessDaysByCodesForCareer(anyString(), anyString(), anyCollection(), anyCollection()))
                .thenReturn(BigDecimal.ZERO);
        lenient().when(demCngRepository.sumBusinessDaysByCodesForYear(anyString(), anyString(), anyCollection(), anyInt(), anyCollection()))
                .thenAnswer(invocation -> {
                    Collection<?> codes = invocation.getArgument(2);
                    Collection<?> statuses = invocation.getArgument(4);
                    boolean annualBalanceLookup = codes.contains("01") && statuses.contains("O");
                    return annualBalanceLookup ? BigDecimal.ZERO : BigDecimal.ZERO;
                });
    }

    @Test
    void createRequest_rejectsAnnualLeaveAboveThirtyDays() {
        MotifJ annual = motif("01", false, 30, null, true, false);
        when(motifJRepository.findById("01")).thenReturn(Optional.of(annual));

        CreateLeaveRequest request = new CreateLeaveRequest(
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 3, 31),
                "01",
                null);

        assertThrows(BadRequestException.class, () -> leaveService.createRequest("00000001", request));
    }

    @Test
    void createRequest_requiresAttachmentForSickLeave() {
        MotifJ sickLeave = motif("02", true, null, null, false, false);
        when(motifJRepository.findById("02")).thenReturn(Optional.of(sickLeave));

        CreateLeaveRequest request = new CreateLeaveRequest(
                LocalDate.of(2026, 1, 5),
                LocalDate.of(2026, 1, 5),
                "02",
                null);

        assertThrows(BadRequestException.class, () -> leaveService.createRequest("00000001", request));
    }

    @Test
    void createRequest_requiresAttachmentForPaternityExtension() {
        MotifJ paternity = motif("12", false, 10, null, false, false);
        when(motifJRepository.findById("12")).thenReturn(Optional.of(paternity));

        CreateLeaveRequest request = new CreateLeaveRequest(
                LocalDate.of(2026, 1, 5),
                LocalDate.of(2026, 1, 14),
                "12",
                null);

        assertThrows(BadRequestException.class, () -> leaveService.createRequest("00000001", request));
    }

    @Test
    void createRequest_doesNotUseAnnualBalanceForUnpaidLeave() {
        MotifJ unpaid = motif("50", false, 90, null, false, false);
        when(motifJRepository.findById("50")).thenReturn(Optional.of(unpaid));

        CreateLeaveRequest request = new CreateLeaveRequest(
                LocalDate.of(2026, 1, 5),
                LocalDate.of(2026, 1, 9),
                "50",
                null);

        assertDoesNotThrow(() -> leaveService.createRequest("00000001", request));
    }

    @Test
    void createRequest_savesAttachmentWhenProvided() {
        MotifJ sickLeave = motif("02", true, null, null, false, false);
        when(motifJRepository.findById("02")).thenReturn(Optional.of(sickLeave));

        MockMultipartFile attachment = new MockMultipartFile(
                "attachment",
                "certificat.pdf",
                "application/pdf",
                "certificat".getBytes());
        CreateLeaveRequest request = new CreateLeaveRequest(
                LocalDate.of(2026, 1, 5),
                LocalDate.of(2026, 1, 5),
                "02",
                null);

        leaveService.createRequest("00000001", request, attachment);

        verify(leaveAttachmentRepository).save(any());
    }

    @Test
    void getMotifs_filtersSexSpecificMotifsForMaleAgent() {
        Personnel male = new Personnel();
        male.setMatPers("00000001");
        male.setCodSoc("0100");
        male.setCodUser("AGENT");
        male.setSexe("M");
        when(personnelRepository.findById("00000001")).thenReturn(Optional.of(male));

        MotifJ maternity = motif("04", false, 60, null, false, false);
        maternity.setSexe("F");
        MotifJ annual = motif("01", false, 30, null, true, false);
        when(motifJRepository.findAllByOrderByCodMAsc()).thenReturn(List.of(annual, maternity));

        var motifs = leaveService.getMotifs("00000001");

        assertEquals(1, motifs.size());
        assertEquals("01", motifs.getFirst().codeM());
    }

    @Test
    void createRequest_rejectsMotifThatDoesNotMatchAgentSex() {
        Personnel male = new Personnel();
        male.setMatPers("00000001");
        male.setCodSoc("0100");
        male.setCodUser("AGENT");
        male.setSexe("M");
        when(personnelRepository.findById("00000001")).thenReturn(Optional.of(male));

        MotifJ maternity = motif("04", false, 60, null, false, false);
        maternity.setSexe("F");
        when(motifJRepository.findById("04")).thenReturn(Optional.of(maternity));

        CreateLeaveRequest request = new CreateLeaveRequest(
                LocalDate.of(2026, 1, 5),
                LocalDate.of(2026, 1, 9),
                "04",
                null);

        assertThrows(BadRequestException.class, () -> leaveService.createRequest("00000001", request));
    }

    private MotifJ motif(String code,
                         boolean requiresAttachment,
                         Integer maxDaysPerYear,
                         Integer maxDaysPerCareer,
                         boolean deductsFromBalance,
                         boolean isHalfPay) {
        MotifJ motif = new MotifJ();
        motif.setCodM(code);
        motif.setLibMot("Motif " + code);
        motif.setRequiresAttachment(requiresAttachment);
        motif.setMaxDaysPerYear(maxDaysPerYear);
        motif.setMaxDaysPerCareer(maxDaysPerCareer);
        motif.setDeductsFromBalance(deductsFromBalance);
        motif.setIsHalfPay(isHalfPay);
        return motif;
    }
}
