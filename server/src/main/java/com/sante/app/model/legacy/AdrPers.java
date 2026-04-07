package com.sante.app.model.legacy;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "\"ADR_PERS\"")
@Getter
@Setter
public class AdrPers {

    @Id
    @Column(name = "\"MAT_PERS\"")
    private String matPers;

    @Column(name = "\"ADR_ELECTRONIQUE\"")
    private String adrElectronique;

    @Column(name = "\"TEL_PERT_PERS\"")
    private String telPertPers;
}
