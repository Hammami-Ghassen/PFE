package com.sante.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdatePersonnelRoleRequest {

    @NotBlank(message = "COD_USER est obligatoire")
    private String codUser;
}
