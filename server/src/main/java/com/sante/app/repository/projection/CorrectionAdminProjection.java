package com.sante.app.repository.projection;

import java.time.LocalDateTime;

public interface CorrectionAdminProjection {

    Long getId();

    String getMatPers();

    String getFullName();

    String getAttributCible();

    String getAncienneValeur();

    String getNouvelleValeur();

    String getStatut();

    LocalDateTime getDateDemande();

    Boolean getHasAttachment();
}
