package com.sante.app.service;

import com.sante.app.dto.request.CreateLeaveRequest;
import com.sante.app.dto.response.LeaveAttachmentResponse;
import com.sante.app.dto.response.LeaveBalanceResponse;
import com.sante.app.dto.response.LeaveEntitlementResponse;
import com.sante.app.dto.response.LeaveHolidayResponse;
import com.sante.app.dto.response.LeaveMotifResponse;
import com.sante.app.dto.response.LeaveRequestResponse;
import com.sante.app.dto.response.LeaveValidationResponse;
import com.sante.app.exception.BadRequestException;
import com.sante.app.exception.ResourceNotFoundException;
import com.sante.app.exception.UnauthorizedException;
import com.sante.app.model.leave.DemCng;
import com.sante.app.model.leave.DemCngId;
import com.sante.app.model.leave.JoursFeriers;
import com.sante.app.model.leave.LeaveAttachment;
import com.sante.app.model.leave.LeaveValidationStatus;
import com.sante.app.model.leave.MotifJ;
import com.sante.app.model.legacy.Personnel;
import com.sante.app.repository.DemCngRepository;
import com.sante.app.repository.JoursFeriersRepository;
import com.sante.app.repository.LeaveAttachmentRepository;
import com.sante.app.repository.MotifJRepository;
import com.sante.app.repository.PersonnelRepository;
import com.sante.app.repository.projection.LeaveValidationProjection;
import com.sante.app.repository.projection.MyLeaveRequestProjection;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private static final int MIN_PAGE_SIZE = 1;
    private static final int MAX_PAGE_SIZE = 200;
    private static final String ROLE_AGENT = "AGENT";
    private static final String ROLE_DIRECTEUR = "DIRECTEUR";
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String MINISTRY_COD_SOC = "0001";
    private static final String ANNUAL_LEAVE_CODE = "01";
    private static final String HAJJ_CODE = "15";
    private static final String PATERNITY_CODE = "12";
    private static final Set<String> FAMILY_CODES = Set.of("10", "11", "13", "14", "17", "18");
    private static final Set<String> CALENDAR_LIMIT_CODES = Set.of("04", "05", "50");
    private static final List<String> PENDING_OR_APPROVED_STATUS_CODES = List.of(
            LeaveValidationStatus.PENDING.getCode(),
            LeaveValidationStatus.APPROVED.getCode());
    private static final List<String> APPROVED_STATUS_CODE = List.of(LeaveValidationStatus.APPROVED.getCode());
    private static final Set<String> ALLOWED_ATTACHMENT_EXTENSIONS = Set.of("pdf", "jpg", "jpeg", "png", "docx");
    private static final long MAX_ATTACHMENT_SIZE_BYTES = 2L * 1024L * 1024L;
    private static final BigDecimal DEFAULT_LEAVE_BALANCE = BigDecimal.valueOf(30).setScale(3, RoundingMode.HALF_UP);
    private static final BigDecimal ZERO_DECIMAL = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);

    private final DemCngRepository demCngRepository;
    private final MotifJRepository motifJRepository;
    private final LeaveAttachmentRepository leaveAttachmentRepository;
    private final PersonnelRepository personnelRepository;
    private final JoursFeriersRepository joursFeriersRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<LeaveMotifResponse> getMotifs() {
        return motifJRepository.findAllByOrderByCodMAsc().stream()
                .map(motif -> new LeaveMotifResponse(
                        motif.getCodM(),
                        emptyToNull(motif.getLibMot()),
                        emptyToNull(motif.getTypCng()),
                        isTrue(motif.getRequiresAttachment()),
                        motif.getMaxDaysPerYear(),
                        motif.getMaxDaysPerCareer(),
                        isTrue(motif.getDeductsFromBalance()),
                        isTrue(motif.getIsHalfPay())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LeaveEntitlementResponse> getEntitlements(String requesterMatPers) {
        Personnel actor = requirePersonnel(normalizeMatPers(requesterMatPers));
        ensureRequesterRole(actor);
        String codSoc = normalizeCodSoc(actor.getCodSoc());
        String matPers = actor.getMatPers();
        int currentYear = LocalDate.now().getYear();

        return motifJRepository.findAllByOrderByCodMAsc().stream()
                .map(motif -> buildEntitlementResponse(codSoc, matPers, currentYear, motif))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LeaveHolidayResponse> getHolidays() {
        return joursFeriersRepository.findAllByOrderByCodFerieAsc().stream()
                .map(holiday -> new LeaveHolidayResponse(
                        holiday.getCodFerie(),
                emptyToNull(holiday.getLibFerie()),
                        emptyToNull(holiday.getDatFerier())))
                .toList();
    }

    @Transactional(readOnly = true)
    public LeaveBalanceResponse getCurrentBalance(String requesterMatPers) {
        Personnel actor = requirePersonnel(normalizeMatPers(requesterMatPers));
        ensureRequesterRole(actor);
        return buildBalanceResponse(actor);
    }

    @Transactional(readOnly = true)
    public LeaveBalanceResponse getBalanceForPerson(String requesterMatPers, String targetMatPers) {
        Personnel actor = requirePersonnel(normalizeMatPers(requesterMatPers));
        String actorRole = normalizeRole(actor.getCodUser());
        if (!ROLE_DIRECTEUR.equals(actorRole) && !ROLE_ADMIN.equals(actorRole)) {
            throw new UnauthorizedException("Seuls les profils DIRECTEUR et ADMIN peuvent consulter ce solde.");
        }

        Personnel target = requirePersonnel(normalizeMatPers(targetMatPers));
        if (ROLE_DIRECTEUR.equals(actorRole)) {
            assertReviewScope(actor, target);
        }

        return buildBalanceResponse(target);
    }

    @Transactional
    public LeaveRequestResponse createRequest(String requesterMatPers, CreateLeaveRequest request) {
        return createRequest(requesterMatPers, request, null);
    }

    @Transactional
    public LeaveRequestResponse createRequest(String requesterMatPers, CreateLeaveRequest request, MultipartFile attachment) {
        Personnel actor = requirePersonnel(normalizeMatPers(requesterMatPers));
        ensureRequesterRole(actor);

        LocalDate dateDebut = request.dateDebut();
        LocalDate dateFin = request.dateFin();
        validateDateRange(dateDebut, dateFin);

        String actorCodSoc = normalizeCodSoc(actor.getCodSoc());
        
        if (demCngRepository.hasOverlappingRequests(actorCodSoc, actor.getMatPers(), dateDebut, dateFin)) {
            throw new BadRequestException("Vous avez déjà une demande de congé en attente ou acceptée qui chevauche ces dates.");
        }

        String motifCode = normalizeCodeM(request.codeM());
        MotifJ motif = motifJRepository.findById(motifCode)
                .orElseThrow(() -> new ResourceNotFoundException("Motif de conge introuvable: " + motifCode));

        Set<String> holidayDayMonthSet = getHolidayDayMonthSet();
        BigDecimal requestedDays = calculateRequestedDays(dateDebut, dateFin, holidayDayMonthSet);
        BigDecimal requestedCalendarDays = calculateCalendarDays(dateDebut, dateFin);
        BigDecimal currentBalance = calculateCurrentBalance(actorCodSoc, actor.getMatPers());

        validateMotifRules(actorCodSoc, actor.getMatPers(), motif, dateDebut, dateFin,
                requestedDays, requestedCalendarDays, currentBalance, attachment);

        if (isTrue(motif.getDeductsFromBalance()) && currentBalance.compareTo(requestedDays) < 0) {
            throw new BadRequestException("Solde de conge insuffisant.");
        }

        Integer nextNumDcng = demCngRepository.findNextNumDcng(actorCodSoc, actor.getMatPers());
        if (nextNumDcng == null || nextNumDcng <= 0) {
            nextNumDcng = 1;
        }

        DemCng demande = new DemCng();
        demande.setId(new DemCngId(actorCodSoc, actor.getMatPers(), nextNumDcng));
        demande.setDatDcng(LocalDate.now());
        demande.setDatDebut(dateDebut);
        demande.setDatFin(dateFin);
        demande.setCodeM(motif.getCodM());
        demande.setValid(LeaveValidationStatus.PENDING.getCode());
        demande.setMotifCng(normalizeOptionalText(request.motifCng(), 1000,
                "Le commentaire ne doit pas depasser 1000 caracteres."));
        demande.setMotifRefus(null);
        demande.setNbrJours(requestedDays);
        demande.setNbrJoursCal(requestedCalendarDays);
        demande.setSoldCng(currentBalance);
        demande.setAnneeCng(dateDebut.getYear());

        DemCng saved = demCngRepository.saveAndFlush(demande);
        saveAttachmentIfPresent(saved, attachment);
        return mapEntityResponse(saved, motif.getLibMot());
    }

    @Transactional(readOnly = true)
    public Page<LeaveRequestResponse> getMyRequests(String requesterMatPers, int page, int size) {
        Personnel actor = requirePersonnel(normalizeMatPers(requesterMatPers));
        ensureRequesterRole(actor);

        Pageable pageable = PageRequest.of(Math.max(0, page), sanitizePageSize(size));
        String codSoc = normalizeCodSoc(actor.getCodSoc());

        return demCngRepository.findMyRequests(codSoc, actor.getMatPers(), pageable)
                .map(this::mapMyRequestProjection);
    }

    @Transactional(readOnly = true)
    public Page<LeaveValidationResponse> getValidationQueue(String reviewerMatPers, String status, int page, int size) {
        Personnel reviewer = requireDirectorReviewer(reviewerMatPers);
        String statusCode = parseNullableStatusCode(status);

        Pageable pageable = PageRequest.of(Math.max(0, page), sanitizePageSize(size));
        String reviewerCodSoc = normalizeCodSoc(reviewer.getCodSoc());

        if (MINISTRY_COD_SOC.equals(reviewerCodSoc)) {
            return demCngRepository.findValidationQueueForMinistry(statusCode, pageable)
                    .map(this::mapValidationProjection);
        }

        return demCngRepository.findValidationQueueForDirector(reviewerCodSoc, statusCode, pageable)
                .map(this::mapValidationProjection);
    }

    @Transactional
    public LeaveValidationResponse reviewRequest(String reviewerMatPers,
                                                 String codSoc,
                                                 String matPers,
                                                 Integer numDcng,
                                                 String status,
                                                 String comment) {
        Personnel reviewer = requireDirectorReviewer(reviewerMatPers);

        String normalizedCodSoc = normalizeCodSoc(codSoc);
        String normalizedMatPers = normalizeMatPers(matPers);
        int normalizedNumDcng = normalizeNumDcng(numDcng);

        if (reviewer.getMatPers().equals(normalizedMatPers)) {
            throw new UnauthorizedException("Vous ne pouvez pas traiter votre propre demande de conge.");
        }

        LeaveValidationStatus reviewStatus = parseReviewStatus(status);

        DemCngId requestId = new DemCngId(normalizedCodSoc, normalizedMatPers, normalizedNumDcng);
        DemCng demande = demCngRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de conge introuvable."));

        LeaveValidationStatus currentStatus = parseExistingStatus(demande.getValid());
        if (currentStatus != LeaveValidationStatus.PENDING) {
            throw new BadRequestException("Cette demande de conge a deja ete traitee.");
        }

        Personnel requester = requirePersonnel(normalizedMatPers);
        String requesterCodSoc = normalizeCodSoc(requester.getCodSoc());
        if (!requesterCodSoc.equals(normalizedCodSoc)) {
            throw new BadRequestException("Incoherence de donnees: COD_SOC du demandeur invalide.");
        }

        assertReviewScope(reviewer, requester);

        demande.setValid(reviewStatus.getCode());
        String normalizedComment = normalizeOptionalText(comment, 1000,
                "Le commentaire ne doit pas depasser 1000 caracteres.");
        if (reviewStatus == LeaveValidationStatus.REJECTED) {
            demande.setMotifRefus(normalizedComment);
        } else {
            demande.setMotifRefus(null);
        }
        demCngRepository.save(demande);

        // Create notification for the agent
        String statusText = (reviewStatus == LeaveValidationStatus.APPROVED) ? "acceptée" : "refusée";
        String notificationMessage = String.format("Votre demande de congé du %s au %s a été %s.", 
                demande.getDatDebut(), demande.getDatFin(), statusText);
                
        notificationService.createNotification(
                demande.getId().getMatPers(), 
                notificationMessage, 
                com.sante.app.model.NotificationType.LEAVE_UPDATE
        );

        return demCngRepository.findValidationProjectionById(normalizedCodSoc, normalizedMatPers, normalizedNumDcng)
                .map(this::mapValidationProjection)
                .orElseGet(() -> mapFallbackValidationResponse(demande, requester));
    }

    @Transactional(readOnly = true)
    public LeaveAttachmentResponse getValidationAttachment(String reviewerMatPers,
                                                           String codSoc,
                                                           String matPers,
                                                           Integer numDcng) {
        Personnel reviewer = requireDirectorReviewer(reviewerMatPers);
        String normalizedCodSoc = normalizeCodSoc(codSoc);
        String normalizedMatPers = normalizeMatPers(matPers);
        int normalizedNumDcng = normalizeNumDcng(numDcng);

        DemCngId requestId = new DemCngId(normalizedCodSoc, normalizedMatPers, normalizedNumDcng);
        DemCng demande = demCngRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de conge introuvable."));

        Personnel requester = requirePersonnel(normalizedMatPers);
        assertReviewScope(reviewer, requester);

        LeaveAttachment attachment = leaveAttachmentRepository
                .findByCodSocAndMatPersAndNumDcng(
                        demande.getId().getCodSoc(),
                        demande.getId().getMatPers(),
                        demande.getId().getNumDcng())
                .orElseThrow(() -> new ResourceNotFoundException("Aucune piece jointe trouvee pour cette demande."));

        return new LeaveAttachmentResponse(attachment.getFileName(), attachment.getFileType(), attachment.getContent());
    }

    private Personnel requireDirectorReviewer(String reviewerMatPers) {
        Personnel reviewer = requirePersonnel(normalizeMatPers(reviewerMatPers));
        String reviewerRole = normalizeRole(reviewer.getCodUser());
        if (!ROLE_DIRECTEUR.equals(reviewerRole)) {
            throw new UnauthorizedException("Seul un directeur peut traiter les demandes de conge.");
        }
        return reviewer;
    }

    private void ensureRequesterRole(Personnel actor) {
        String role = normalizeRole(actor.getCodUser());
        if (!ROLE_AGENT.equals(role) && !ROLE_DIRECTEUR.equals(role)) {
            throw new UnauthorizedException("Seuls les profils AGENT et DIRECTEUR peuvent deposer une demande de conge.");
        }
    }

    private void assertReviewScope(Personnel reviewer, Personnel requester) {
        String reviewerCodSoc = normalizeCodSoc(reviewer.getCodSoc());
        String requesterCodSoc = normalizeCodSoc(requester.getCodSoc());
        String requesterRole = normalizeRole(requester.getCodUser());

        if (MINISTRY_COD_SOC.equals(reviewerCodSoc)) {
            boolean canReview = ROLE_DIRECTEUR.equals(requesterRole) && !MINISTRY_COD_SOC.equals(requesterCodSoc);
            if (!canReview) {
                throw new UnauthorizedException("Le ministere ne peut traiter que les demandes des directeurs des etablissements.");
            }
            return;
        }

        boolean canReview = ROLE_AGENT.equals(requesterRole) && reviewerCodSoc.equals(requesterCodSoc);
        if (!canReview) {
            throw new UnauthorizedException("Un directeur ne peut traiter que les demandes des agents de son etablissement.");
        }
    }

    private void validateMotifRules(String codSoc,
                                    String matPers,
                                    MotifJ motif,
                                    LocalDate dateDebut,
                                    LocalDate dateFin,
                                    BigDecimal requestedBusinessDays,
                                    BigDecimal requestedCalendarDays,
                                    BigDecimal currentBalance,
                                    MultipartFile attachment) {
        String motifCode = normalizeCodeM(motif.getCodM());
        BigDecimal requestedLimitDays = usesCalendarLimit(motifCode) ? requestedCalendarDays : requestedBusinessDays;

        boolean paternityExtension = PATERNITY_CODE.equals(motifCode)
                && requestedBusinessDays.compareTo(BigDecimal.valueOf(7)) > 0;
        boolean attachmentRequired = isTrue(motif.getRequiresAttachment()) || paternityExtension;
        validateAttachment(attachment, attachmentRequired);

        if (PATERNITY_CODE.equals(motifCode)
                && requestedBusinessDays.compareTo(BigDecimal.valueOf(10)) > 0) {
            throw new BadRequestException("Le conge paternite ne peut pas depasser 10 jours.");
        }

        if (HAJJ_CODE.equals(motifCode)) {
            BigDecimal previousHajjDays = sumUsage(codSoc, matPers, List.of(HAJJ_CODE), null, true, PENDING_OR_APPROVED_STATUS_CODES);
            if (previousHajjDays.compareTo(BigDecimal.ZERO) > 0) {
                throw new BadRequestException("Le pelerinage (Hajj) est autorise une seule fois dans la carriere.");
            }
        }

        Collection<String> ruleCodes = getRuleCodes(motifCode);
        if (motif.getMaxDaysPerYear() != null) {
            BigDecimal usedThisYear = sumUsage(codSoc, matPers, ruleCodes, dateDebut.getYear(), usesCalendarLimit(motifCode), PENDING_OR_APPROVED_STATUS_CODES);
            assertWithinLimit(usedThisYear, requestedLimitDays, motif.getMaxDaysPerYear(),
                    "Le plafond annuel pour ce type de conge est depasse.");
        }
        if (motif.getMaxDaysPerCareer() != null) {
            BigDecimal usedCareer = sumUsage(codSoc, matPers, ruleCodes, null, usesCalendarLimit(motifCode), PENDING_OR_APPROVED_STATUS_CODES);
            assertWithinLimit(usedCareer, requestedLimitDays, motif.getMaxDaysPerCareer(),
                    "Le plafond carriere pour ce type de conge est depasse.");
        }

        if (isTrue(motif.getDeductsFromBalance()) && currentBalance.compareTo(requestedBusinessDays) < 0) {
            throw new BadRequestException("Solde de conge insuffisant.");
        }
    }

    private void assertWithinLimit(BigDecimal usedDays,
                                   BigDecimal requestedDays,
                                   Integer limitDays,
                                   String errorMessage) {
        BigDecimal limit = BigDecimal.valueOf(limitDays);
        if (normalizeDecimal(usedDays).add(normalizeDecimal(requestedDays)).compareTo(limit) > 0) {
            throw new BadRequestException(errorMessage);
        }
    }

    private LeaveEntitlementResponse buildEntitlementResponse(String codSoc,
                                                              String matPers,
                                                              int currentYear,
                                                              MotifJ motif) {
        String motifCode = normalizeCodeM(motif.getCodM());
        Collection<String> ruleCodes = getRuleCodes(motifCode);
        boolean calendarLimit = usesCalendarLimit(motifCode);
        BigDecimal usedYear = sumUsage(codSoc, matPers, ruleCodes, currentYear, calendarLimit, PENDING_OR_APPROVED_STATUS_CODES);
        BigDecimal usedCareer = sumUsage(codSoc, matPers, ruleCodes, null, calendarLimit, PENDING_OR_APPROVED_STATUS_CODES);

        return new LeaveEntitlementResponse(
                motif.getCodM(),
                emptyToNull(motif.getLibMot()),
                isTrue(motif.getRequiresAttachment()),
                motif.getMaxDaysPerYear(),
                motif.getMaxDaysPerCareer(),
                isTrue(motif.getDeductsFromBalance()),
                isTrue(motif.getIsHalfPay()),
                usedYear,
                usedCareer,
                remainingDays(motif.getMaxDaysPerYear(), usedYear),
                remainingDays(motif.getMaxDaysPerCareer(), usedCareer));
    }

    private BigDecimal remainingDays(Integer limit, BigDecimal used) {
        if (limit == null) {
            return null;
        }
        BigDecimal remaining = BigDecimal.valueOf(limit).subtract(normalizeDecimal(used));
        if (remaining.compareTo(BigDecimal.ZERO) < 0) {
            return ZERO_DECIMAL;
        }
        return normalizeDecimal(remaining);
    }

    private Collection<String> getRuleCodes(String motifCode) {
        if (FAMILY_CODES.contains(motifCode)) {
            return FAMILY_CODES;
        }
        return List.of(motifCode);
    }

    private boolean usesCalendarLimit(String motifCode) {
        return CALENDAR_LIMIT_CODES.contains(motifCode);
    }

    private BigDecimal sumUsage(String codSoc,
                                String matPers,
                                Collection<String> codes,
                                Integer year,
                                boolean calendarDays,
                                Collection<String> statusCodes) {
        BigDecimal value;
        if (year == null) {
            value = calendarDays
                    ? demCngRepository.sumCalendarDaysByCodesForCareer(codSoc, matPers, codes, statusCodes)
                    : demCngRepository.sumBusinessDaysByCodesForCareer(codSoc, matPers, codes, statusCodes);
        } else {
            value = calendarDays
                    ? demCngRepository.sumCalendarDaysByCodesForYear(codSoc, matPers, codes, year, statusCodes)
                    : demCngRepository.sumBusinessDaysByCodesForYear(codSoc, matPers, codes, year, statusCodes);
        }
        return normalizeDecimal(value);
    }

    private void validateAttachment(MultipartFile attachment, boolean required) {
        if (attachment == null || attachment.isEmpty()) {
            if (required) {
                throw new BadRequestException("La piece jointe est obligatoire pour ce motif de conge.");
            }
            return;
        }
        if (attachment.getSize() > MAX_ATTACHMENT_SIZE_BYTES) {
            throw new BadRequestException("La piece jointe depasse la taille maximale de 2 Mo.");
        }

        String extension = getFileExtension(attachment.getOriginalFilename());
        if (!ALLOWED_ATTACHMENT_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Format de piece jointe invalide. Formats autorises: PDF, JPG, JPEG, PNG, DOCX.");
        }
    }

    private void saveAttachmentIfPresent(DemCng demande, MultipartFile attachment) {
        if (attachment == null || attachment.isEmpty()) {
            return;
        }

        LeaveAttachment entity = new LeaveAttachment();
        entity.setCodSoc(demande.getId().getCodSoc());
        entity.setMatPers(demande.getId().getMatPers());
        entity.setNumDcng(demande.getId().getNumDcng());
        entity.setFileName(normalizeAttachmentFileName(attachment.getOriginalFilename()));
        entity.setFileType(emptyToNull(attachment.getContentType()) == null ? "application/octet-stream" : attachment.getContentType());
        entity.setFileSize(attachment.getSize());
        entity.setContent(toAttachmentBytes(attachment));
        leaveAttachmentRepository.save(entity);
    }

    private byte[] toAttachmentBytes(MultipartFile attachment) {
        try {
            return attachment.getBytes();
        } catch (IOException ex) {
            throw new BadRequestException("Impossible de lire la piece jointe.");
        }
    }

    private String normalizeAttachmentFileName(String fileName) {
        String normalized = emptyToNull(fileName);
        if (normalized == null) {
            return "justificatif-conge.bin";
        }
        return normalized.length() <= 255 ? normalized : normalized.substring(0, 255);
    }

    private String getFileExtension(String fileName) {
        String normalized = emptyToNull(fileName);
        if (normalized == null || !normalized.contains(".")) {
            return "";
        }
        return normalized.substring(normalized.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    private LeaveValidationStatus parseReviewStatus(String status) {
        LeaveValidationStatus parsed = parseStatus(status);
        if (parsed == LeaveValidationStatus.PENDING) {
            throw new BadRequestException("Le statut I n'est pas autorise pour la revue.");
        }
        return parsed;
    }

    private String parseNullableStatusCode(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return parseStatus(status).getCode();
    }

    private LeaveValidationStatus parseExistingStatus(String statusCode) {
        try {
            return LeaveValidationStatus.fromValue(statusCode);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Statut de conge invalide dans la base: " + statusCode);
        }
    }

    private LeaveValidationStatus parseStatus(String status) {
        try {
            return LeaveValidationStatus.fromValue(status);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Statut invalide. Valeurs autorisees: I, O, N.");
        }
    }

    private void validateDateRange(LocalDate dateDebut, LocalDate dateFin) {
        if (dateDebut == null || dateFin == null) {
            throw new BadRequestException("Les dates de debut et de fin sont obligatoires.");
        }
        if (dateDebut.isAfter(dateFin)) {
            throw new BadRequestException("La date de debut doit etre inferieure ou egale a la date de fin.");
        }
    }

    private LeaveBalanceResponse buildBalanceResponse(Personnel personnel) {
        String codSoc = normalizeCodSoc(personnel.getCodSoc());
        String matPers = normalizeMatPers(personnel.getMatPers());
        return new LeaveBalanceResponse(
                codSoc,
                matPers,
                LocalDate.now().getYear(),
                calculateCurrentBalance(codSoc, matPers));
    }

    private BigDecimal calculateCurrentBalance(String codSoc, String matPers) {
        BigDecimal approvedAnnualDays = normalizeDecimal(demCngRepository.sumBusinessDaysByCodesForYear(
                codSoc,
                matPers,
                List.of(ANNUAL_LEAVE_CODE),
                LocalDate.now().getYear(),
                APPROVED_STATUS_CODE));
        BigDecimal balance = DEFAULT_LEAVE_BALANCE.subtract(approvedAnnualDays);
        if (balance.compareTo(BigDecimal.ZERO) < 0) {
            return ZERO_DECIMAL;
        }
        return normalizeDecimal(balance);
    }

    private BigDecimal calculateRequestedDays(LocalDate dateDebut,
                                              LocalDate dateFin,
                                              Set<String> holidayDayMonthSet) {
        long days = 0;
        for (LocalDate current = dateDebut; !current.isAfter(dateFin); current = current.plusDays(1)) {
            boolean weekend = current.getDayOfWeek() == DayOfWeek.SATURDAY || current.getDayOfWeek() == DayOfWeek.SUNDAY;
            boolean holiday = holidayDayMonthSet.contains(toDayMonth(current));
            if (!weekend && !holiday) {
                days++;
            }
        }

        return BigDecimal.valueOf(days).setScale(3, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateCalendarDays(LocalDate dateDebut, LocalDate dateFin) {
        long days = ChronoUnit.DAYS.between(dateDebut, dateFin) + 1;
        return BigDecimal.valueOf(days).setScale(3, RoundingMode.HALF_UP);
    }

    private Set<String> getHolidayDayMonthSet() {
        Set<String> dayMonths = new HashSet<>();
        for (JoursFeriers holiday : joursFeriersRepository.findAllByOrderByCodFerieAsc()) {
            String dayMonth = normalizeHolidayDayMonth(holiday.getDatFerier());
            if (dayMonth != null) {
                dayMonths.add(dayMonth);
            }
        }
        return dayMonths;
    }

    private String normalizeHolidayDayMonth(String dayMonth) {
        if (dayMonth == null || dayMonth.isBlank()) {
            return null;
        }

        String normalized = dayMonth.trim();
        if (!normalized.matches("\\d{2}/\\d{2}")) {
            return null;
        }
        return normalized;
    }

    private String toDayMonth(LocalDate date) {
        return String.format(Locale.ROOT, "%02d/%02d", date.getDayOfMonth(), date.getMonthValue());
    }

    private BigDecimal normalizeDecimal(BigDecimal value) {
        if (value == null) {
            return ZERO_DECIMAL;
        }
        return value.setScale(3, RoundingMode.HALF_UP);
    }

    private LeaveRequestResponse mapEntityResponse(DemCng demande, String libMot) {
        LeaveValidationStatus status = parseExistingStatus(demande.getValid());
        return new LeaveRequestResponse(
                demande.getId().getCodSoc(),
                demande.getId().getMatPers(),
                demande.getId().getNumDcng(),
                demande.getDatDcng(),
                demande.getDatDebut(),
                demande.getDatFin(),
                demande.getCodeM(),
                emptyToNull(libMot),
                demande.getNbrJours(),
                status.getCode(),
                status.getLabel(),
                emptyToNull(demande.getMotifRefus()));
    }

    private LeaveRequestResponse mapMyRequestProjection(MyLeaveRequestProjection projection) {
        LeaveValidationStatus status = parseExistingStatus(projection.getValid());
        return new LeaveRequestResponse(
                projection.getCodSoc(),
                projection.getMatPers(),
                projection.getNumDcng(),
                projection.getDatDcng(),
                projection.getDatDebut(),
                projection.getDatFin(),
                projection.getCodeM(),
                emptyToNull(projection.getLibMot()),
                projection.getNbrJours(),
                status.getCode(),
                status.getLabel(),
                emptyToNull(projection.getMotifRefus()));
                
    }

    private LeaveValidationResponse mapValidationProjection(LeaveValidationProjection projection) {
        LeaveValidationStatus status = parseExistingStatus(projection.getValid());
        return new LeaveValidationResponse(
                projection.getCodSoc(),
                projection.getMatPers(),
                projection.getNumDcng(),
                emptyToNull(projection.getFullName()),
                emptyToNull(projection.getDemandeurRole()),
                projection.getDatDcng(),
                projection.getDatDebut(),
                projection.getDatFin(),
                projection.getCodeM(),
                emptyToNull(projection.getLibMot()),
                projection.getNbrJours(),
                emptyToNull(projection.getMotifCng()),
                Boolean.TRUE.equals(projection.getHasAttachment()),
                Boolean.TRUE.equals(projection.getIsHalfPay()),
                status.getCode(),
                status.getLabel(),
                emptyToNull(projection.getMotifRefus()));
    }

    private LeaveValidationResponse mapFallbackValidationResponse(DemCng demande, Personnel requester) {
        MotifJ motif = motifJRepository.findById(demande.getCodeM()).orElse(null);
        String libMot = motif == null ? null : motif.getLibMot();

        LeaveValidationStatus status = parseExistingStatus(demande.getValid());
        String fullName = buildFullName(requester.getPrenPers(), requester.getNomPers());

        return new LeaveValidationResponse(
                demande.getId().getCodSoc(),
                demande.getId().getMatPers(),
                demande.getId().getNumDcng(),
                emptyToNull(fullName),
                normalizeRole(requester.getCodUser()),
                demande.getDatDcng(),
                demande.getDatDebut(),
                demande.getDatFin(),
                demande.getCodeM(),
                emptyToNull(libMot),
                demande.getNbrJours(),
                emptyToNull(demande.getMotifCng()),
                leaveAttachmentRepository.existsByCodSocAndMatPersAndNumDcng(
                        demande.getId().getCodSoc(),
                        demande.getId().getMatPers(),
                        demande.getId().getNumDcng()),
                motif != null && Boolean.TRUE.equals(motif.getIsHalfPay()),
                status.getCode(),
                status.getLabel(),
                emptyToNull(demande.getMotifRefus()));
    }

    private String buildFullName(String prenom, String nom) {
        String normalizedPrenom = emptyToNull(prenom);
        String normalizedNom = emptyToNull(nom);

        if (normalizedPrenom == null && normalizedNom == null) {
            return null;
        }
        if (normalizedPrenom == null) {
            return normalizedNom;
        }
        if (normalizedNom == null) {
            return normalizedPrenom;
        }
        return normalizedPrenom + " " + normalizedNom;
    }

    private Personnel requirePersonnel(String matPers) {
        return personnelRepository.findById(matPers)
                .orElseThrow(() -> new ResourceNotFoundException("Personnel introuvable pour MAT_PERS: " + matPers));
    }

    private int normalizeNumDcng(Integer numDcng) {
        if (numDcng == null || numDcng <= 0) {
            throw new BadRequestException("NUM_DCNG est invalide.");
        }
        return numDcng;
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

    private String normalizeCodSoc(String codSoc) {
        if (codSoc == null || codSoc.isBlank()) {
            throw new BadRequestException("COD_SOC est obligatoire.");
        }
        return codSoc.trim();
    }

    private String normalizeCodeM(String codeM) {
        if (codeM == null || codeM.isBlank()) {
            throw new BadRequestException("Le code motif est obligatoire.");
        }

        String normalized = codeM.trim().toUpperCase(Locale.ROOT);
        if (normalized.length() > 4) {
            throw new BadRequestException("Le code motif est invalide.");
        }
        return normalized;
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            throw new UnauthorizedException("Role utilisateur introuvable.");
        }
        return role.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeOptionalText(String value, int maxLength, String errorMessage) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new BadRequestException(errorMessage);
        }
        return normalized;
    }

    private int sanitizePageSize(int size) {
        return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, size));
    }

    private String emptyToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private boolean isTrue(Boolean value) {
        return Boolean.TRUE.equals(value);
    }
}
