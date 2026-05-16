package com.sante.app.model.leave;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "\"MOTIF_J\"")
@Getter
@Setter
public class MotifJ {

    @Id
    @Column(name = "\"COD_M\"", nullable = false, length = 4)
    private String codM;

    @Column(name = "\"LIB_MOT\"", length = 60)
    private String libMot;

    @Column(name = "\"TYP_CNG\"", length = 4)
    private String typCng;

    @Column(name = "\"REQUIRES_ATTACHMENT\"")
    private Boolean requiresAttachment = false;

    @Column(name = "\"MAX_DAYS_PER_YEAR\"")
    private Integer maxDaysPerYear;

    @Column(name = "\"MAX_DAYS_PER_CAREER\"")
    private Integer maxDaysPerCareer;

    @Column(name = "\"DEDUCTS_FROM_BALANCE\"")
    private Boolean deductsFromBalance = false;

    @Column(name = "\"IS_HALF_PAY\"")
    private Boolean isHalfPay = false;
}
