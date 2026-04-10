package com.sante.app.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sante.app.dto.response.AuthResponse;
import com.sante.app.exception.BadRequestException;
import com.sante.app.exception.UnauthorizedException;
import com.sante.app.model.legacy.Personnel;
import com.sante.app.repository.AdrPersRepository;
import com.sante.app.repository.PersonnelRepository;
import com.sante.app.repository.projection.ProfileProjection;
import com.sante.app.security.jwt.JwtTokenProvider;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OtpAuthServiceTest {

    @Mock
    private PersonnelRepository personnelRepository;
    @Mock
    private AdrPersRepository adrPersRepository;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private OtpStoreService otpStoreService;
    @Mock
    private AuthTokenService authTokenService;

    private OtpAuthService otpAuthService;

    @BeforeEach
    void setUp() {
        otpAuthService = new OtpAuthService(
                personnelRepository,
                adrPersRepository,
                jwtTokenProvider,
                otpStoreService,
                authTokenService);
    }

    @Test
    void verifyOtp_preservesLeadingZerosAndConsumesOtp() throws Exception {
        String matPers = "00091651";
        String otp = "123456";

        Personnel personnel = new Personnel();
        personnel.setMatPers(matPers);
        personnel.setCodUser("AGENT");

        String storedHash = sha256(otp);
        when(personnelRepository.findById(matPers)).thenReturn(Optional.of(personnel));
        when(otpStoreService.findOtpHash(matPers)).thenReturn(storedHash);
        when(authTokenService.generateAccessToken(matPers, "AGENT")).thenReturn("access-token");
        when(authTokenService.issueAndPersistRefreshToken(matPers)).thenReturn("refresh-token");
        when(authTokenService.toBearerAuthResponse("access-token", matPers, "AGENT"))
            .thenReturn(new AuthResponse("access-token", null, "Bearer", 900L, matPers, "AGENT"));

        OtpAuthService.TokenSession session = otpAuthService.verifyOtp(matPers, otp);

        assertEquals("access-token", session.authResponse().accessToken());
        assertEquals("refresh-token", session.refreshToken());

        verify(personnelRepository).findById("00091651");
        verify(otpStoreService).findOtpHash("00091651");
        verify(otpStoreService).deleteOtp("00091651");
        verify(authTokenService).generateAccessToken(eq("00091651"), eq("AGENT"));
    }

    @Test
    void verifyOtp_replayAttemptFailsAfterFirstConsumption() throws Exception {
        String matPers = "00091651";
        String otp = "123456";

        Personnel personnel = new Personnel();
        personnel.setMatPers(matPers);
        personnel.setCodUser("ADMIN");

        when(personnelRepository.findById(matPers)).thenReturn(Optional.of(personnel));
        when(authTokenService.generateAccessToken(any(), any())).thenReturn("access-token");
        when(authTokenService.issueAndPersistRefreshToken(any())).thenReturn("refresh-token");
        when(authTokenService.toBearerAuthResponse(any(), any(), any()))
                .thenReturn(new AuthResponse("access-token", null, "Bearer", 900L, matPers, "ADMIN"));
        when(otpStoreService.findOtpHash(matPers)).thenReturn(sha256(otp)).thenReturn(null);

        otpAuthService.verifyOtp(matPers, otp);

        assertThrows(UnauthorizedException.class, () -> otpAuthService.verifyOtp(matPers, otp));
        verify(otpStoreService).deleteOtp(matPers);
    }

    @Test
    void getProfile_mapsProjectionFieldsWithoutChangingContract() {
        String matPers = "00091651";

        ProfileProjection projection = org.mockito.Mockito.mock(ProfileProjection.class);
        when(projection.getMatPers()).thenReturn(matPers);
        when(projection.getFirstName()).thenReturn("Ali");
        when(projection.getLastName()).thenReturn("Ben Salah");
        when(projection.getCodUser()).thenReturn("AGENT");
        when(projection.getCodSoc()).thenReturn("010");
        when(projection.getEstablishmentName()).thenReturn("Hopital Central");
        when(projection.getEmail()).thenReturn("ali@example.com");
        when(projection.getPhone()).thenReturn("20111222");
        when(projection.getRue()).thenReturn("Rue Principale");
        when(projection.getLibDeleg()).thenReturn("Tunis Centre");
        when(projection.getLibGouv()).thenReturn("Tunis");
        when(projection.getService()).thenReturn("Ressources Humaines");
        when(projection.getGrade()).thenReturn("A1");
        when(projection.getPosteTravail()).thenReturn("Charge de dossier");

        when(personnelRepository.findAuthProfileByMatPers(matPers)).thenReturn(projection);

        var profile = otpAuthService.getProfile(matPers);

        assertEquals("00091651", profile.matPers());
        assertEquals("Ali", profile.firstName());
        assertEquals("Ben Salah", profile.lastName());
        assertEquals("Ali Ben Salah", profile.fullName());
        assertEquals("AGENT", profile.role());
        assertEquals("010", profile.codSoc());
        assertEquals("Hopital Central", profile.establishmentName());
        assertEquals("ali@example.com", profile.email());
        assertEquals("20111222", profile.phone());
        assertEquals("Rue Principale, Tunis Centre, Tunis", profile.adresse());
        assertEquals("Ressources Humaines", profile.service());
        assertEquals("A1", profile.grade());
        assertEquals("Charge de dossier", profile.posteTravail());
    }

    @Test
    void verifyOtp_rejectsInvalidMatPersFormat() {
        assertThrows(BadRequestException.class, () -> otpAuthService.verifyOtp("91651", "123456"));
    }

    private static String sha256(String value) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }
}
