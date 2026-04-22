package com.sante.app.repository.projection;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface LeaveValidationProjection {

    String getCodSoc();

    String getMatPers();

    Integer getNumDcng();

    String getFullName();

    String getDemandeurRole();

    LocalDate getDatDcng();

    LocalDate getDatDebut();

    LocalDate getDatFin();

    String getCodeM();

    String getLibMot();

    BigDecimal getNbrJours();

    String getValid();
}
