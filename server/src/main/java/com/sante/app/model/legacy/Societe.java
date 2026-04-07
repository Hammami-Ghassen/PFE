package com.sante.app.model.legacy;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "\"SOCIETE\"")
@Getter
@Setter
public class Societe {

    @Id
    @Column(name = "\"COD_SOC\"")
    private String codSoc;

    @Column(name = "\"LIB_SOC\"")
    private String libSoc;
}
