package com.sante.app.model.legacy;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "\"PERSONNEL\"")
@Getter
@Setter
public class Personnel {

    @Id
    @Column(name = "\"MAT_PERS\"")
    private String matPers;

    @Column(name = "\"COD_USER\"")
    private String codUser;

    @Column(name = "\"COD_SOC\"")
    private String codSoc;
}
