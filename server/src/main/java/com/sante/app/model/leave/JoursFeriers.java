package com.sante.app.model.leave;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "\"JOURS_FERIERS\"")
@Getter
@Setter
public class JoursFeriers {

    @Id
    @Column(name = "\"COD_FERIE\"", nullable = false)
    private String codFerie;

    @Column(name = "\"LIB_FERIE\"")
    private String libFerie;

    @Column(name = "\"DAT_FERIER\"")
    private String datFerier;
}
