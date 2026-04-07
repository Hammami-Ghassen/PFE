package com.sante.app.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthProfileResponse {
    private String matPers;
    private String role;
    private String codUser;
    private String codSoc;
    private String establishmentName;
    private String email;
    private String phone;
}
