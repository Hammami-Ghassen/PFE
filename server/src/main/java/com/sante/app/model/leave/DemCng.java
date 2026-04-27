package com.sante.app.model.leave;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "\"DEM_CNG\"")
@Getter
@Setter
public class DemCng {

    @EmbeddedId
    private DemCngId id;

    @Column(name = "\"DAT_DCNG\"", nullable = false)
    private LocalDate datDcng;

    @Column(name = "\"DAT_DEBUT\"", nullable = false)
    private LocalDate datDebut;

    @Column(name = "\"DAT_FIN\"", nullable = false)
    private LocalDate datFin;

    @Column(name = "\"CODE_M\"", length = 4)
    private String codeM;

    @Column(name = "\"VALID\"", length = 1)
    private String valid;

    @Column(name = "\"MOTIF_CNG\"", length = 1000)
    private String motifCng;

    @Column(name = "\"MOTIF_REFUS\"", length = 1000)
    private String motifRefus;

    @Column(name = "\"NBR_JOURS\"", precision = 7, scale = 3)
    private BigDecimal nbrJours;

    @Column(name = "\"NBR_JOURS_CAL\"", precision = 7, scale = 3)
    private BigDecimal nbrJoursCal;

    @Column(name = "\"SOLD_CNG\"", precision = 7, scale = 3)
    private BigDecimal soldCng;

    @Column(name = "\"ANNEE_CNG\"")
    private Integer anneeCng;
}
