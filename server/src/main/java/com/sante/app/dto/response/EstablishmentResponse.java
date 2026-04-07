package com.sante.app.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EstablishmentResponse {
    private String codSoc;
    private String libSoc;
}
