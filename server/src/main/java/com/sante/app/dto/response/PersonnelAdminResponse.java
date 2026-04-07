package com.sante.app.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PersonnelAdminResponse {
    private String matPers;
    private String codUser;
    private String codSoc;
    private String establishmentName;
    private String email;
    private String phone;
}
