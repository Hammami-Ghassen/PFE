package com.sante.app.repository.projection;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface MyLeaveRequestProjection {

    String getCodSoc();

    String getMatPers();

    Integer getNumDcng();

    LocalDate getDatDcng();

    LocalDate getDatDebut();

    LocalDate getDatFin();

    String getCodeM();

    String getLibMot();

    BigDecimal getNbrJours();

    String getValid();

    String getMotifRefus();
}
