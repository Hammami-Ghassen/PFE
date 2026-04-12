package com.sante.app.model.correction;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "\"DEMANDE_CORRECTION_INFO\"")
@Getter
@Setter
public class DemandeCorrectionInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ID\"")
    private Long id;

    @Column(name = "\"MAT_PERS\"", nullable = false, length = 8)
    private String matPers;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"ATTRIBUT_CIBLE\"", nullable = false, length = 32)
    private CorrectionTargetAttribute attributCible;

    @Column(name = "\"ANCIENNE_VALEUR\"")
    private String ancienneValeur;

    @Column(name = "\"NOUVELLE_VALEUR\"", nullable = false)
    private String nouvelleValeur;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"STATUT\"", nullable = false, length = 16)
    private CorrectionRequestStatus statut = CorrectionRequestStatus.PENDING;

    @CreationTimestamp
    @Column(name = "\"DATE_DEMANDE\"", nullable = false, updatable = false)
    private LocalDateTime dateDemande;

    @Basic(fetch = FetchType.LAZY)
    @Column(name = "\"PIECE_JOINTE\"", nullable = false)
    private byte[] pieceJointe;
}
